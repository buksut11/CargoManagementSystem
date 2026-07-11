"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass } from "./ui";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
// Monday-first, matching how shipping schedules are usually planned.
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

type Ymd = { y: number; m: number; d: number };

/* Dates are handled as plain Y/M/D numbers (never through Date's ISO
   parser) so the picker is immune to timezone shifts around midnight. */
function parseISO(value: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayYmd(): Ymd {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

function sameDay(a: Ymd, y: number, m: number, d: number) {
  return a.y === y && a.m === m && a.d === d;
}

/* Always six rows (42 cells) so the popover never changes height while
   flipping months; leading/trailing cells belong to adjacent months. */
function monthCells(y: number, m: number) {
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // Mon = 0
  const cells: { y: number; m: number; d: number; outside: boolean }[] = [];
  const start = new Date(y, m, 1 - firstWeekday);
  for (let i = 0; i < 42; i++) {
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      y: cur.getFullYear(),
      m: cur.getMonth(),
      d: cur.getDate(),
      outside: cur.getMonth() !== m,
    });
  }
  return cells;
}

function Chevron({ left = false }: { left?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d={left ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

const navButtonClass =
  "flex h-7 w-7 items-center justify-center rounded-full border border-white/60 bg-white/40 text-slate-600 transition-colors hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/[0.14]";

export function DatePicker({
  value,
  onChange,
  required = false,
  placeholder = "Pick a date",
}: {
  /** ISO date string (YYYY-MM-DD) or "" when empty — same shape as a native date input. */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [view, setView] = useState<"days" | "months">("days");
  const selected = parseISO(value);
  const today = todayYmd();
  const [viewY, setViewY] = useState(selected?.y ?? today.y);
  const [viewM, setViewM] = useState(selected?.m ?? today.m);

  function openPopover() {
    const rect = rootRef.current?.getBoundingClientRect();
    // The popover is ~320px tall; flip above the field when it would
    // otherwise run off the bottom of the viewport.
    if (rect) setDropUp(window.innerHeight - rect.bottom < 340 && rect.top > 340);
    const base = parseISO(value) ?? todayYmd();
    setViewY(base.y);
    setViewM(base.m);
    setView("days");
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pick(y: number, m: number, d: number) {
    onChange(toISO(y, m, d));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const next = viewM + delta;
    setViewY(viewY + Math.floor(next / 12));
    setViewM(((next % 12) + 12) % 12);
  }

  const label = selected
    ? `${selected.d} ${MONTHS[selected.m].slice(0, 3)} ${selected.y}`
    : placeholder;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
      >
        <span
          className={
            selected
              ? "truncate text-slate-900 dark:text-slate-100"
              : "truncate text-slate-400 dark:text-slate-500"
          }
        >
          {label}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
          aria-hidden
        >
          <rect x={3} y={5} width={18} height={16} rx={3} />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      </button>

      {/* Keeps native "please fill out this field" validation working for
          required dates even though the visible control is a button. */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          onFocus={openPopover}
          required
          tabIndex={-1}
          aria-hidden
          className="sr-only"
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Choose date"
          className={`glass-popover animate-pop-in absolute left-0 z-50 w-60 rounded-2xl p-2.5 ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => (view === "days" ? shiftMonth(-1) : setViewY(viewY - 1))}
              aria-label={view === "days" ? "Previous month" : "Previous year"}
              className={navButtonClass}
            >
              <Chevron left />
            </button>
            <button
              type="button"
              onClick={() => setView(view === "days" ? "months" : "days")}
              className="rounded-full px-3 py-1 text-sm font-semibold text-slate-800 transition-colors hover:bg-white/60 dark:text-slate-100 dark:hover:bg-white/[0.1]"
            >
              {view === "days" ? `${MONTHS[viewM]} ${viewY}` : viewY}
            </button>
            <button
              type="button"
              onClick={() => (view === "days" ? shiftMonth(1) : setViewY(viewY + 1))}
              aria-label={view === "days" ? "Next month" : "Next year"}
              className={navButtonClass}
            >
              <Chevron />
            </button>
          </div>

          {view === "days" ? (
            <>
              <div className="grid grid-cols-7">
                {WEEKDAYS.map((w) => (
                  <span
                    key={w}
                    className="flex h-6 items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                  >
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthCells(viewY, viewM).map((c) => {
                  const isSelected = selected != null && sameDay(selected, c.y, c.m, c.d);
                  const isToday = sameDay(today, c.y, c.m, c.d);
                  return (
                    <button
                      key={`${c.y}-${c.m}-${c.d}`}
                      type="button"
                      onClick={() => pick(c.y, c.m, c.d)}
                      className={`mx-auto flex h-7.5 w-7.5 items-center justify-center rounded-full text-[13px] transition-colors ${
                        isSelected
                          ? "bg-blue-600 font-semibold text-white shadow-lg shadow-blue-500/40"
                          : `hover:bg-white/60 dark:hover:bg-white/[0.1] ${
                              c.outside
                                ? "text-slate-400/80 dark:text-slate-600"
                                : isToday
                                  ? "font-semibold text-blue-600 ring-1 ring-inset ring-blue-400/60 dark:text-blue-400"
                                  : "text-slate-700 dark:text-slate-200"
                            }`
                      }`}
                    >
                      {c.d}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-1 py-1">
              {MONTHS.map((name, i) => {
                const isCurrent = selected != null && selected.y === viewY && selected.m === i;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setViewM(i);
                      setView("days");
                    }}
                    className={`rounded-lg py-2 text-[13px] transition-colors ${
                      isCurrent
                        ? "bg-blue-600 font-semibold text-white shadow-lg shadow-blue-500/40"
                        : "text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.1]"
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-1.5 flex items-center justify-between border-t border-slate-900/10 pt-1.5 dark:border-white/10">
            {!required && value ? (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.1] dark:hover:text-slate-200"
              >
                Clear
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => pick(today.y, today.m, today.d)}
              className="rounded-full px-2.5 py-1 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-500/10 dark:text-blue-400"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
