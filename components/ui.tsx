"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  ChangeEvent,
  InputHTMLAttributes,
  OptionHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`glass-panel rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}

// A rounded icon chip — the blue-tinted square that leads every section header.
// Exposed on its own so inline card headings (dashboards, tables) can carry the
// same chip without wrapping their whole body in a Section.
export function IconChip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300 ${className}`}
    >
      {children}
    </span>
  );
}

// A titled glass panel led by a rounded icon chip — the building block that
// gives the booking form its look. Reused app-wide so every card carries the
// same icon + title + subtitle header. `bare` drops the panel chrome so it can
// sit as a header inside an existing Card (e.g. above a table).
export function Section({
  icon,
  title,
  subtitle,
  action,
  bare = false,
  className = "",
  children,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bare?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section
      className={`${bare ? "" : "glass-panel rounded-2xl p-4 sm:p-5"} ${className}`}
    >
      <div className={`flex items-start gap-3 ${children ? "mb-4" : ""}`}>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary:
      "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700",
    secondary:
      "border border-white/60 dark:border-white/10 bg-white/35 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 backdrop-blur hover:bg-white/60 dark:hover:bg-white/[0.1]",
    danger:
      "border border-red-200/70 dark:border-red-500/30 bg-white/35 dark:bg-white/[0.05] text-red-600 dark:text-red-400 backdrop-blur hover:bg-red-50/80 dark:hover:bg-red-500/15",
  }[variant];
  return (
    <button
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full min-w-0 rounded-xl border border-white/70 dark:border-white/10 bg-white/40 dark:bg-white/[0.05] px-3 py-2 text-sm backdrop-blur outline-none [color-scheme:light] dark:[color-scheme:dark] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:border-blue-400 dark:focus:ring-blue-500/30";

export function Input({
  onWheel,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={inputClass}
      onWheel={(e) => {
        // Scrolling the mouse wheel over a focused number input silently nudges
        // its value by one `step` — so a typed 130 becomes 129.99 the moment the
        // cursor rolls past the field on the way to the save button. Drop focus
        // instead so the wheel scrolls the page and never edits what was typed.
        if (e.currentTarget.type === "number") e.currentTarget.blur();
        onWheel?.(e);
      }}
      {...props}
    />
  );
}

// Compact pill buttons for inline row actions (Edit / Delete / Statement in
// tables and ledger lists) so they match the app's pill styling instead of
// looking like bare text links.
export const rowActionClass =
  "inline-flex items-center rounded-full border border-white/60 bg-white/40 px-3 py-1 text-xs font-medium text-blue-600 backdrop-blur transition-colors hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.06] dark:text-blue-400 dark:hover:bg-white/[0.12]";
export const rowDeleteClass =
  "inline-flex items-center rounded-full border border-red-200/70 bg-white/40 px-3 py-1 text-xs font-medium text-red-600 backdrop-blur transition-colors hover:bg-red-50/80 dark:border-red-500/30 dark:bg-white/[0.06] dark:text-red-400 dark:hover:bg-red-500/15";

// ── Custom glass dropdown ───────────────────────────────────────────────────
// Drop-in replacement for the old native <select>: same API (`value`,
// `onChange(e)` and <option> children), but the open list is a frosted glass
// popover matching the rest of the app instead of the OS-native menu. Rendered
// through a portal on <body> — the glass cards create stacking contexts
// (backdrop-filter), so an in-card popover would be painted over by later
// cards, exactly like the date picker.

type SelectOption = { value: string; label: string; disabled: boolean };

// Plain text of an <option>'s children (labels are strings or string arrays).
function optionText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(optionText).join("");
  if (isValidElement(node)) {
    return optionText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function collectOptions(children: ReactNode): SelectOption[] {
  const out: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      const p = child.props as OptionHTMLAttributes<HTMLOptionElement>;
      const label = optionText(p.children);
      out.push({
        value: p.value != null ? String(p.value) : label,
        label,
        disabled: !!p.disabled,
      });
    } else {
      // Fragments / optgroup / conditional wrappers — recurse into them.
      const inner = (child.props as { children?: ReactNode }).children;
      if (inner) out.push(...collectOptions(inner));
    }
  });
  return out;
}

export function Select({
  value,
  onChange,
  required,
  disabled,
  children,
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, bottom: 0, width: 0 });
  const [highlight, setHighlight] = useState(-1);
  const [search, setSearch] = useState("");

  const allOptions = collectOptions(children);
  // Show the type-to-filter box only once a list is long enough to be worth
  // searching — tiny yes/no style dropdowns stay clutter-free.
  const searchable = allOptions.length > 6;
  const q = search.trim().toLowerCase();
  // The open list is filtered as the user types; scrolling still works on the
  // filtered results, so users can scroll *or* type to narrow things down.
  const options =
    q && searchable
      ? allOptions.filter((o) => o.label.toLowerCase().includes(q))
      : allOptions;
  // Keep the latest (possibly filtered) options for the document-level keyboard
  // handler, whose closure would otherwise go stale as the query changes.
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  const current = value != null ? String(value) : "";
  const selectedIdx = options.findIndex((o) => o.value === current);
  // The trigger label always reflects the chosen value from the full list,
  // even while the open popover is filtered by a search query. Like a native
  // select, fall back to showing the first option.
  const label =
    allOptions.find((o) => o.value === current)?.label ??
    (allOptions[0]?.label ?? "");

  const updatePos = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDropUp(window.innerHeight - rect.bottom < 288 && rect.top > 288);
    setPos({
      left: Math.max(4, Math.min(rect.left, window.innerWidth - rect.width - 4)),
      top: rect.bottom + 6,
      bottom: window.innerHeight - rect.top + 6,
      width: rect.width,
    });
  }, []);

  function openList() {
    if (disabled) return;
    updatePos();
    // Reset the query each time so the list opens showing everything, with the
    // current value highlighted.
    setSearch("");
    setHighlight(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }

  function pick(v: string) {
    setOpen(false);
    // Callers read e.target.value exactly as they did with the native select.
    onChange?.({ target: { value: v } } as ChangeEvent<HTMLSelectElement>);
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
      const opts = optionsRef.current;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (opts.length === 0) return;
        setHighlight((h) => {
          const dir = e.key === "ArrowDown" ? 1 : -1;
          let next = h;
          for (let i = 0; i < opts.length; i++) {
            next = (next + dir + opts.length) % opts.length;
            if (!opts[next].disabled) break;
          }
          return next;
        });
      }
      if (e.key === "Enter") {
        e.preventDefault();
        setHighlight((h) => {
          // Fall back to the first enabled match so pressing Enter after typing
          // selects the obvious result without arrowing to it first.
          const opt = opts[h] ?? opts.find((o) => !o.disabled);
          if (opt && !opt.disabled) pick(opt.value);
          return h;
        });
      }
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
    // options is rebuilt each render from children; the listeners only need
    // resubscribing when the popover opens or closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, updatePos]);

  // Keep the keyboard highlight visible while arrowing through a long list.
  useEffect(() => {
    if (!open || highlight < 0) return;
    popRef.current
      ?.querySelector(`[data-idx="${highlight}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  // Focus the filter box as soon as the list opens so the user can just start
  // typing — no extra click needed.
  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openList())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputClass} flex items-center justify-between gap-2 text-left disabled:opacity-50`}
      >
        <span className="truncate text-slate-900 dark:text-slate-100">
          {label || " "}
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Keeps native "please fill out this field" validation working. */}
      {required && (
        <input
          type="text"
          value={current}
          onChange={() => {}}
          onFocus={openList}
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
            role="listbox"
            style={{
              left: pos.left,
              // Grow to fit the longest option instead of clipping it, but stay
              // at least as wide as the trigger and never past the viewport edge.
              minWidth: pos.width,
              maxWidth: `calc(100vw - ${pos.left + 8}px)`,
              ...(dropUp ? { bottom: pos.bottom } : { top: pos.top }),
            }}
            className="glass-popover animate-pop-in fixed z-50 flex max-h-72 w-max flex-col rounded-xl p-1.5"
          >
            {searchable && (
              <div className="sticky top-0 z-10 p-1 pb-1.5">
                <div className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    aria-hidden
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.3-4.3" />
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      // Jump the highlight back to the top of the new results so
                      // Enter picks the best match.
                      setHighlight(0);
                    }}
                    placeholder="Type to search…"
                    aria-label="Filter options"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
            {options.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No matches
              </div>
            )}
            {options.map((o, i) => {
              const isSelected = o.value === current;
              return (
                <button
                  key={`${o.value}-${i}`}
                  type="button"
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  disabled={o.disabled}
                  onClick={() => pick(o.value)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 ${
                    isSelected
                      ? "font-semibold text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-200"
                  } ${
                    highlight === i
                      ? "bg-white/70 dark:bg-white/[0.12]"
                      : "hover:bg-white/60 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    >
                      <path d="M5 13l4 4 10-10" />
                    </svg>
                  )}
                </button>
              );
            })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={inputClass} rows={3} {...props} />;
}

export function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function Th({ children }: { children?: ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
      {message}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass-panel relative z-10 w-full max-w-sm rounded-3xl p-6"
      >
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {message && (
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {message}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-full border border-white/60 bg-white/35 px-4 py-2 text-sm font-medium text-slate-700 backdrop-blur transition-colors hover:bg-white/60 disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-200 dark:hover:bg-white/[0.12]"
          >
            {t(cancelLabel)}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/30 transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? t("Deleting…") : t(confirmLabel)}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
      {message}
    </p>
  );
}
