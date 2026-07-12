"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const popRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  // Viewport coordinates for the popover. It renders through a portal on
  // <body> with position:fixed — the glass cards use backdrop-filter, which
  // creates stacking contexts, so a popover nested inside a card would get
  // painted OVER by the next card on the page no matter its z-index.
  const [pos, setPos] = useState({ left: 0, top: 0, bottom: 0 });
  const [view, setView] = useState<"days" | "months">("days");
  const selected = parseISO(value);
  const today = todayYmd();
  const [viewY, setViewY] = useState(selected?.y ?? today.y);
  const [viewM, setViewM] = useState(selected?.m ?? today.m);

  // (Re)compute where the popover goes, anchored to the field. The popover is
  // ~320px tall and 240px wide; flip above the field when it would otherwise
  // run off the bottom, and clamp horizontally to the viewport.
  const updatePos = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDropUp(window.innerHeight - rect.bottom < 340 && rect.top > 340);
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 248)),
      top: rect.bottom + 8,
      bottom: window.innerHeight - rect.top + 8,
    });
  }, []);

  function openPopover() {
    updatePos();
    const base = parseISO(value) ?? todayYmd();
    setViewY(base.y);
    setViewM(base.m);
    setView("days");
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(t) &&
        popRef.current &&
        !popRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // Keep the portal-rendered popover glued to the field while the page
    // scrolls or resizes underneath it.
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

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

      {open &&
        createPortal(
        <div
          ref={popRef}
          role="dialog"
          aria-label="Choose date"
          style={
            dropUp
              ? { left: pos.left, bottom: pos.bottom }
              : { left: pos.left, top: pos.top }
          }
          className="glass-popover animate-pop-in fixed z-50 w-60 rounded-2xl p-2.5"
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
        </div>,
        document.body,
      )}
    </div>
  );
}

function ClockIcon() {
  return (
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
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const ITEM_H = 32; // px, matches the h-8 option buttons below

/* A glass hour/minute picker matching the DatePicker, replacing the OS-native
   <input type="time"> so the popover looks like the rest of the app. Value
   shape is "HH:mm" (24h) or "" — same as a native time input. */
export function TimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Time",
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minColRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, bottom: 0 });

  const valid = /^(\d{2}):(\d{2})$/.test(value);
  const hh = valid ? value.slice(0, 2) : "";
  const mm = valid ? value.slice(3, 5) : "";

  const updatePos = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDropUp(window.innerHeight - rect.bottom < 260 && rect.top > 260);
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 168)),
      top: rect.bottom + 8,
      bottom: window.innerHeight - rect.top + 8,
    });
  }, []);

  function openPopover() {
    if (disabled) return;
    updatePos();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(t) &&
        popRef.current &&
        !popRef.current.contains(t)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  // Centre the current hour/minute in each column when the popover opens,
  // without scrolling the page (the columns are the only things that move).
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const centre = (el: HTMLDivElement | null, i: number) => {
        if (el) el.scrollTop = i * ITEM_H - el.clientHeight / 2 + ITEM_H / 2;
      };
      centre(hourColRef.current, hh ? Number(hh) : 0);
      centre(minColRef.current, mm ? Number(mm) : 0);
    });
    return () => cancelAnimationFrame(id);
  }, [open, hh, mm]);

  const label = valid ? `${hh}:${mm}` : placeholder;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPopover())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={`${inputClass} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span
          className={
            valid
              ? "truncate text-slate-900 dark:text-slate-100"
              : "truncate text-slate-400 dark:text-slate-500"
          }
        >
          {label}
        </span>
        <ClockIcon />
      </button>

      {open &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Choose time"
            style={
              dropUp
                ? { left: pos.left, bottom: pos.bottom }
                : { left: pos.left, top: pos.top }
            }
            className="glass-popover animate-pop-in fixed z-50 w-40 rounded-2xl p-2"
          >
            <div className="mb-1 grid grid-cols-2 gap-1">
              {["Hour", "Min"].map((h) => (
                <span
                  key={h}
                  className="flex h-5 items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500"
                >
                  {h}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-1">
              <TimeColumn
                colRef={hourColRef}
                items={HOURS}
                selected={hh}
                onPick={(h) => onChange(`${h}:${mm || "00"}`)}
              />
              <TimeColumn
                colRef={minColRef}
                items={MINUTES}
                selected={mm}
                onPick={(m) => onChange(`${hh || "00"}:${m}`)}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function TimeColumn({
  colRef,
  items,
  selected,
  onPick,
}: {
  colRef: React.RefObject<HTMLDivElement | null>;
  items: string[];
  selected: string;
  onPick: (v: string) => void;
}) {
  return (
    <div
      ref={colRef}
      className="h-40 overflow-y-auto scroll-smooth rounded-xl [scrollbar-width:thin]"
    >
      {items.map((v) => {
        const isSelected = v === selected;
        return (
          <button
            key={v}
            type="button"
            data-selected={isSelected}
            onClick={() => onPick(v)}
            className={`flex h-8 w-full items-center justify-center rounded-lg text-[13px] transition-colors ${
              isSelected
                ? "bg-blue-600 font-semibold text-white shadow-lg shadow-blue-500/40"
                : "text-slate-700 hover:bg-white/60 dark:text-slate-200 dark:hover:bg-white/[0.1]"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
