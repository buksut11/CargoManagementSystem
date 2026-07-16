"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button, ErrorNote, Field, Input, Section, Textarea } from "@/components/ui";
import { ClockIcon, MailIcon, PhoneIcon, PinIcon } from "@/components/icons";

// Public contact page (no sign-in needed, like /pricing). Submissions land in
// the contact_messages table (migration 0044); they are write-only for
// visitors and read from the Supabase dashboard.

const CONTACT_DETAILS = [
  {
    icon: <PhoneIcon />,
    label: "Phone",
    value: "+252 615 714971",
    href: "tel:+252615714971",
  },
  {
    icon: <PinIcon />,
    label: "Address",
    value: "Baidoa - Somalia",
    href: null,
  },
  {
    icon: <MailIcon />,
    label: "Email",
    value: "adaninow@gmail.com",
    href: "mailto:adaninow@gmail.com",
  },
];

const BUSINESS_HOURS = [
  { days: "Saturday – Wednesday", hours: "8:00 am - 4:00 pm", open: true },
  { days: "Thursday", hours: "Closed", open: false },
  { days: "Friday", hours: "Closed", open: false },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("contact_messages").insert({
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    setBusy(false);
    if (error) {
      setError(
        error.code === "23514"
          ? "Please double-check your details — one of the fields looks invalid."
          : "Your message could not be sent. Please try again, or reach us by phone or email.",
      );
      return;
    }
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setSent(true);
  }

  return (
    <main className="min-h-dvh px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-6xl">
        {/* Title left, intro right — same top row as the reference layout. */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Contact Us
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400 md:text-right">
            If you have any questions, please feel free to get in touch with us
            via phone, email, or the form below!
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          {/* Left: the form */}
          <Section
            icon={<MailIcon />}
            title="Get in touch"
            subtitle="Send us a message and we'll get back to you"
          >
            {sent ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 px-6 py-10 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                    aria-hidden
                  >
                    <path d="M5 13l4 4 10-10" />
                  </svg>
                </span>
                <div>
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Message sent!
                  </div>
                  <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400/80">
                    Thank you for reaching out — we&apos;ll get back to you as
                    soon as possible.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setSent(false)}
                >
                  Send another message
                </Button>
              </div>
            ) : (
              <form onSubmit={send} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name">
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name*"
                      maxLength={200}
                      required
                    />
                  </Field>
                  <Field label="Phone number">
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number*"
                      minLength={4}
                      maxLength={40}
                      required
                    />
                  </Field>
                </div>
                <Field label="Email">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email*"
                    maxLength={320}
                    required
                  />
                </Field>
                <Field label="Your message">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help you?"
                    rows={5}
                    maxLength={5000}
                    required
                  />
                </Field>
                <ErrorNote message={error} />
                <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:px-8">
                  {busy ? "Sending…" : "Send message"}
                </Button>
              </form>
            )}
          </Section>

          {/* Right: contact information + business hours */}
          <div className="grid gap-6">
            <Section
              icon={<PhoneIcon />}
              title="Contact information"
              subtitle="Reach us directly"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {CONTACT_DETAILS.map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                        {item.label}
                      </div>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="mt-0.5 block break-words text-sm font-medium text-slate-900 hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <div className="mt-0.5 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              icon={<ClockIcon />}
              title="Business hours"
              subtitle="When you can reach us"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                {BUSINESS_HOURS.map((slot) => (
                  <div
                    key={slot.days}
                    className="rounded-2xl border border-white/60 bg-white/40 p-3.5 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                      {slot.days}
                    </div>
                    <div
                      className={`mt-1 text-sm font-medium ${
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

        <p className="mt-10 text-center text-sm text-slate-600 dark:text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
