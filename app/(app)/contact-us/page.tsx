"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/org-context";
import { Field, PageHeader, Section, Select, Textarea } from "@/components/ui";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "@/components/icons";

// Staff → developer contact page. Messages don't go through the database at
// all: the form composes a WhatsApp message to the app owner, pre-filled with
// who is writing and from which organization, and opens it in WhatsApp.

const OWNER_PHONE = "+252 615 714971";
const OWNER_PHONE_WA = "252615714971"; // wa.me format: digits only
const OWNER_EMAIL = "adaninow@gmail.com";

const CATEGORIES = [
  { value: "feature", label: "💡 Feature request" },
  { value: "problem", label: "⚠️ Problem / error" },
  { value: "other", label: "💬 Other" },
] as const;

export default function ContactUsPage() {
  const org = useOrg();
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>("feature");
  const [message, setMessage] = useState("");

  // Who is writing — attached to the WhatsApp text so the owner always knows
  // the sender even before saving the number.
  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? "");
    });
    return () => {
      active = false;
    };
  }, []);

  const categoryLabel =
    CATEGORIES.find((c) => c.value === category)?.label ?? category;
  const text = [
    `${categoryLabel} — CargoBook`,
    `From: ${email || "unknown user"}${org?.orgName ? ` (${org.orgName})` : ""}`,
    "",
    message.trim(),
  ].join("\n");
  const waHref = `https://wa.me/${OWNER_PHONE_WA}?text=${encodeURIComponent(text)}`;

  function send(e: React.FormEvent) {
    e.preventDefault();
    window.open(waHref, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <PageHeader title="Contact Us" />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Section
          icon={<WhatsAppIcon />}
          title="Message the developer"
          subtitle="Feature requests, problems, or anything else — straight to WhatsApp"
        >
          <form onSubmit={send} className="space-y-4">
            <Field label="What is it about?">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Your message"
              hint="Your email and organization are attached automatically."
            >
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the feature you'd like, or the problem you ran into…"
                rows={5}
                required
              />
            </Field>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-[#1fb355] disabled:opacity-50 sm:w-auto sm:px-8"
            >
              <WhatsAppIcon className="h-4.5 w-4.5" />
              Send via WhatsApp
            </button>
          </form>
        </Section>

        <Section
          icon={<PhoneIcon />}
          title="Other ways to reach us"
          subtitle="If WhatsApp isn't an option"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                <PhoneIcon />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Phone
                </div>
                <a
                  href={`tel:+${OWNER_PHONE_WA}`}
                  className="mt-0.5 block break-words text-sm font-medium text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                >
                  {OWNER_PHONE}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                <MailIcon />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Email
                </div>
                <a
                  href={`mailto:${OWNER_EMAIL}`}
                  className="mt-0.5 block break-words text-sm font-medium text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                >
                  {OWNER_EMAIL}
                </a>
              </div>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            Available Saturday – Wednesday, 8:00 am – 4:00 pm. Thursday and
            Friday are non-working days.
          </p>
        </Section>
      </div>
    </div>
  );
}
