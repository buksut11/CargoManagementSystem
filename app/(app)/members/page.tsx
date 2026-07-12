"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/org-context";
import type { OrgRole } from "@/lib/types";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  rowDeleteClass,
  Section,
  Select,
  Td,
  Th,
} from "@/components/ui";
import { ClockIcon, MailIcon } from "@/components/icons";

type Member = {
  id: string;
  user_id: string;
  role: OrgRole;
  email: string | null;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
};

export default function MembersPage() {
  const org = useOrg();
  const orgId = org?.orgId ?? "";
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("agent");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    if (!orgId) return;
    let active = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!active) return;
      setMeId(userData.user?.id ?? null);

      const { data: mems } = await supabase
        .from("memberships")
        .select("id, user_id, role")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true });
      if (!active) return;

      const ids = (mems ?? []).map((m) => m.user_id as string);
      const emailById = new Map<string, string | null>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", ids);
        if (!active) return;
        for (const p of profs ?? [])
          emailById.set(p.id as string, p.email as string | null);
      }

      setMembers(
        (mems ?? []).map((m) => ({
          id: m.id as string,
          user_id: m.user_id as string,
          role: m.role as OrgRole,
          email: emailById.get(m.user_id as string) ?? null,
        })),
      );

      const { data: inv } = await supabase
        .from("invitations")
        .select("id, email, role, token, expires_at")
        .eq("org_id", orgId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (!active) return;
      setInvites((inv as Invite[]) ?? []);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [version, orgId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setLastLink(null);
    setEmailed(false);
    setCopied(false);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken ?? ""}`,
      },
      body: JSON.stringify({ orgId, email: email.trim().toLowerCase(), role }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok || !data.link) {
      setError(data.error ?? "Could not create the invite.");
      return;
    }
    setLastLink(data.link);
    setEmailed(Boolean(data.emailed));
    setEmail("");
    reload();
  }

  async function changeRole(m: Member, next: OrgRole) {
    const { error: upErr } = await supabase
      .from("memberships")
      .update({ role: next })
      .eq("id", m.id);
    if (upErr) setError(upErr.message);
    else reload();
  }

  async function confirmRemove() {
    if (!pendingRemove) return;
    setRemoving(true);
    const { error: delErr } = await supabase
      .from("memberships")
      .delete()
      .eq("id", pendingRemove.id);
    setRemoving(false);
    if (delErr) setError(delErr.message);
    else reload();
    setPendingRemove(null);
  }

  async function revokeInvite(id: string) {
    const { error: delErr } = await supabase.from("invitations").delete().eq("id", id);
    if (delErr) setError(delErr.message);
    else reload();
  }

  function copyLink() {
    if (!lastLink) return;
    navigator.clipboard?.writeText(lastLink).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div>
      <PageHeader title="Members" />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Section
            icon={<MailIcon />}
            title="Invite someone"
            subtitle="Add a teammate to this organization"
          >
            <form onSubmit={invite} className="space-y-3">
              <Field label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  required
                />
              </Field>
              <Field label="Role">
                <Select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </Select>
              </Field>
              <Button type="submit" disabled={busy || !orgId} className="w-full">
                {busy ? "Creating…" : "Create invite link"}
              </Button>
            </form>
            <div className="mt-3">
              <ErrorNote message={error} />
            </div>
            {lastLink && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p className="mb-2 font-medium text-emerald-800 dark:text-emerald-300">
                  {emailed
                    ? "Invite emailed — you can also share this link:"
                    : "Invite link ready — share it with them:"}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={lastLink}
                    className="min-w-0 flex-1 truncate rounded-lg border border-white/60 bg-white/40 px-2 py-1.5 text-slate-700 backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="shrink-0 rounded-full bg-blue-600 px-2.5 py-1.5 font-medium text-white hover:bg-blue-700"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </Section>

          {invites.length > 0 && (
            <Section icon={<ClockIcon />} title="Pending invites">
              <ul className="space-y-2">
                {invites.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {inv.email}{" "}
                      <span className="capitalize text-slate-400">· {inv.role}</span>
                    </span>
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      className={`shrink-0 ${rowDeleteClass}`}
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <Card className="table-scroll">
          <table className="w-full">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {members.map((m) => {
                const isSelf = m.user_id === meId;
                const isOwner = m.role === "owner";
                return (
                  <tr key={m.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                    <Td className="font-medium">
                      {m.email ?? "—"}
                      {isSelf && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                    </Td>
                    <Td>
                      {isOwner ? (
                        <span className="capitalize">{m.role}</span>
                      ) : (
                        <Select
                          value={m.role}
                          onChange={(e) => changeRole(m, e.target.value as OrgRole)}
                        >
                          <option value="agent">Agent</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </Select>
                      )}
                    </Td>
                    <Td className="text-right">
                      {!isOwner && !isSelf && (
                        <button
                          onClick={() => setPendingRemove(m)}
                          className={rowDeleteClass}
                        >
                          Remove
                        </button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && members.length === 0 && (
            <EmptyState message="No members yet." />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pendingRemove}
        title="Remove member?"
        message={
          pendingRemove
            ? `Remove ${pendingRemove.email ?? "this member"} from the organization? They will lose access.`
            : undefined
        }
        busy={removing}
        onConfirm={confirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
