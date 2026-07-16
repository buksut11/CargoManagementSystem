import type { Metadata } from "next";

// The page itself is a client component (interactive form), so the route's
// metadata lives here.
export const metadata: Metadata = {
  title: "Contact us — CargoBook",
  description:
    "Questions? Get in touch by phone, email, or the contact form.",
};

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
