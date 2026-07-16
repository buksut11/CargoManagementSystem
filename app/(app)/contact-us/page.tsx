"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrg } from "@/components/org-context";
import { Field, Section, Textarea } from "@/components/ui";
import {
  ClockIcon,
  ContactCardIcon,
  MailIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/icons";

// Staff → developer contact page. Messages don't go through the database at
// all: the form composes a WhatsApp message to the app owner, pre-filled with
// who is writing and from which organization, and opens it in WhatsApp.

const OWNER_PHONE = "+252 615 714971";
const OWNER_PHONE_WA = "252615714971"; // wa.me format: digits only
const OWNER_EMAIL = "adaninow@gmail.com";

const CATEGORIES = [
  { value: "feature", emoji: "💡", label: "Feature request" },
  { value: "problem", emoji: "⚠️", label: "Problem / error" },
  { value: "other", emoji: "💬", label: "Something else" },
] as const;

const HOURS = [
  { days: "Saturday – Wednesday", hours: "8:00 am - 4:00 pm", open: true },
  { days: "Thursday", hours: "Closed", open: false },
  { days: "Friday", hours: "Closed", open: false },
];

// One row of the "Contact information" card: icon chip, small uppercase
// label, and the value (a link where it makes sense to tap it).
function InfoRow({
  icon,
  label,
  value,
  href,
  chipClass = "bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  chipClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chipClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {label}
        </div>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
            className="mt-0.5 block truncate text-sm font-semibold text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
          >
            {value}
          </a>
        ) : (
          <div className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {value}
          </div>
        )}
      </div>
    </div>
  );
}

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

  const cat = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
  const text = [
    `${cat.emoji} ${cat.label} — CargoBook`,
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
      {/* Title left, supporting line right — the same top row as the
          classic contact-page layout. */}
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Contact Us</h1>
        <p className="max-w-md text-sm text-slate-500 dark:text-slate-400 md:text-right">
          Questions, ideas, or something not working? Get in touch — we usually
          reply within the same working day.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left: the message form */}
        <Section
          icon={<MailIcon />}
          title="Get in touch"
          subtitle="Send us a message on WhatsApp — it arrives instantly"
        >
          <form onSubmit={send} className="space-y-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
                What is it about?
              </span>
              <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
                {CATEGORIES.map((c) => {
                  const selected = c.value === category;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setCategory(c.value)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors sm:flex-col sm:gap-1 sm:py-3 ${
                        selected
                          ? "border-blue-500/60 bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/40 dark:border-blue-400/50 dark:bg-blue-400/10 dark:text-blue-300 dark:ring-blue-400/30"
                          : "border-white/60 bg-white/40 text-slate-600 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]"
                      }`}
                    >
                      <span className="text-base leading-none" aria-hidden>
                        {c.emoji}
                      </span>
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Your message">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the feature you'd like, or the problem you ran into…"
                rows={6}
                required
              />
            </Field>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition-colors hover:bg-[#1fb355]"
            >
              <WhatsAppIcon className="h-4.5 w-4.5" />
              Send via WhatsApp
            </button>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Opens WhatsApp with your message ready to send — your email and
              organization are attached automatically.
            </p>
          </form>
        </Section>

        {/* Right: contact information + business hours */}
        <div className="grid gap-6">
          <Section
            icon={<ContactCardIcon />}
            title="Contact information"
            subtitle="Reach us directly"
          >
            <div className="space-y-4">
              <InfoRow
                icon={<WhatsAppIcon />}
                label="WhatsApp"
                value={OWNER_PHONE}
                href={`https://wa.me/${OWNER_PHONE_WA}`}
                chipClass="bg-[#25d366]/15 text-[#1fa855] dark:bg-[#25d366]/20 dark:text-[#4ade80]"
              />
              <InfoRow
                icon={<PhoneIcon />}
                label="Phone"
                value={OWNER_PHONE}
                href={`tel:+${OWNER_PHONE_WA}`}
              />
              <InfoRow
                icon={<MailIcon />}
                label="Email"
                value={OWNER_EMAIL}
                href={`mailto:${OWNER_EMAIL}`}
              />
            </div>
          </Section>

          <Section
            icon={<ClockIcon />}
            title="Business hours"
            subtitle="When you can reach us"
          >
            <div className="grid gap-2.5 sm:grid-cols-3">
              {HOURS.map((slot) => (
                <div
                  key={slot.days}
                  className="rounded-2xl border border-white/60 bg-white/40 p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {slot.days}
                  </div>
                  <div
                    className={`mt-1 text-sm font-semibold ${
                      slot.open
                        ? "text-slate-900 dark:text-slate-100"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {slot.hours}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Thursday and Friday are non-working days.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
