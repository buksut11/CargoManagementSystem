"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";

// The customer statement moved to a single, menu-level page
// (/flights/statement) that adds a customer picker and a date range. This old
// per-customer URL now just forwards there with the customer preselected, so
// existing links and bookmarks keep working.
export default function CustomerStatementRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    router.replace(`/flights/statement?customer=${id}`);
  }, [id, router]);

  return <p className="p-8 text-sm text-slate-400">{t("Opening statement…")}</p>;
}
