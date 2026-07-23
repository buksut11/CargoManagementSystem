"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BookingSeat } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { DatePicker } from "@/components/date-picker";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  rowActionClass,
  rowDeleteClass,
  Section,
  Td,
  Th,
} from "@/components/ui";
import { PlaneIcon } from "@/components/icons";
import { useT } from "@/lib/i18n";

const fmtCount = (n: number) => Math.round(n).toLocaleString("en-US");

export default function BookingSeatsPage() {
  const t = useT();
  const [rows, setRows] = useState<BookingSeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [seatDate, setSeatDate] = useState("");
  const [airName, setAirName] = useState("");
  const [city, setCity] = useState("");
  const [seats, setSeats] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [pending, setPending] = useState<BookingSeat | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  const formRef = useRef<HTMLDivElement>(null);

  function resetForm() {
    setEditingId(null);
    setSeatDate("");
    setAirName("");
    setCity("");
    setSeats("");
    setError(null);
  }

  function startEdit(r: BookingSeat) {
    setEditingId(r.id);
    setSeatDate(r.seat_date);
    setAirName(r.air_name);
    setCity(r.city);
    setSeats(String(r.seats));
    setError(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    let active = true;
    supabase
      .from("booking_seats")
      .select("*")
      .order("seat_date", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        setRows((data as BookingSeat[]) ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      seat_date: seatDate,
      air_name: airName.trim(),
      city: city.trim(),
      seats: Math.max(0, Math.round(Number(seats) || 0)),
    };
    const { error } = editingId
      ? await supabase.from("booking_seats").update(payload).eq("id", editingId)
      : await supabase.from("booking_seats").insert(payload);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    resetForm();
    reload();
  }

  async function confirmRemove() {
    if (!pending) return;
    setDeleting(true);
    const { error } = await supabase
      .from("booking_seats")
      .delete()
      .eq("id", pending.id);
    setDeleting(false);
    if (error) setError(error.message);
    else reload();
    setPending(null);
  }

  return (
    <div>
      <PageHeader title={t("Booking Seats")} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Section
          icon={<PlaneIcon />}
          title={editingId ? t("Edit booking seats") : t("New booking seats")}
          subtitle={t("Seat blocks you hold with an airline")}
        >
          <div ref={formRef} className="-mt-2 scroll-mt-6" />
          <form onSubmit={save} className="space-y-3">
            <Field label={t("Date")}>
              <DatePicker value={seatDate} onChange={setSeatDate} required />
            </Field>
            <Field label={t("Air name")}>
              <Input
                value={airName}
                onChange={(e) => setAirName(e.target.value)}
                placeholder="e.g. Turkish Airlines"
                required
              />
            </Field>
            <Field label={t("City")}>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t("e.g. Istanbul")}
                required
              />
            </Field>
            <Field label={t("Number of Seats")}>
              <Input
                type="number"
                min={0}
                step={1}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
                placeholder="e.g. 12"
                required
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? t("Saving…") : editingId ? t("Save changes") : t("Add booking seats")}
              </Button>
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  {t("Cancel")}
                </Button>
              )}
            </div>
            <ErrorNote message={error} />
          </form>
        </Section>
        <Card className="table-scroll">
          <div className="space-y-3 p-3 lg:hidden">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200/60 bg-white/40 p-4 shadow-sm dark:bg-white/[0.04] dark:border-white/10"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.air_name}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {fmtDate(r.seat_date)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  📍 {r.city} · {fmtCount(r.seats)} {t("seats")}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => startEdit(r)} className={rowActionClass}>
                    {t("Edit")}
                  </button>
                  <button onClick={() => setPending(r)} className={rowDeleteClass}>
                    {t("Delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <table className="hidden w-full lg:table">
            <thead className="border-b border-slate-200/60 dark:border-white/10">
              <tr>
                <Th>{t("Date")}</Th>
                <Th>{t("Air name")}</Th>
                <Th>{t("City")}</Th>
                <Th>{t("Seats")}</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/10">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/60 dark:hover:bg-white/[0.08]">
                  <Td className="whitespace-nowrap">{fmtDate(r.seat_date)}</Td>
                  <Td className="font-medium">{r.air_name}</Td>
                  <Td>{r.city}</Td>
                  <Td>{fmtCount(r.seats)}</Td>
                  <Td className="text-right">
                    <span className="inline-flex items-center gap-2">
                      <button onClick={() => startEdit(r)} className={rowActionClass}>
                        {t("Edit")}
                      </button>
                      <button onClick={() => setPending(r)} className={rowDeleteClass}>
                        {t("Delete")}
                      </button>
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <EmptyState message={t("No booking seats yet — add your first entry with the form.")} />
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pending}
        title={t("Delete booking seats?")}
        message={
          pending
            ? t('Delete the {date} entry for "{air}"?', {
                date: fmtDate(pending.seat_date),
                air: pending.air_name,
              })
            : undefined
        }
        busy={deleting}
        onConfirm={confirmRemove}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
