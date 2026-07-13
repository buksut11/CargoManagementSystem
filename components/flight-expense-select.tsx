"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FLIGHT_EXPENSE_CATEGORY_LABEL } from "@/lib/format";
import type { FlightExpenseCategory } from "@/lib/types";
import { Button, ErrorNote, Input, Select } from "@/components/ui";

const ADD_NEW = "__add_new__";

// The four built-ins always lead the list; custom per-org categories (migration
// 0039) follow. Both are stored on the expense as the option's value.
const BUILT_INS = Object.entries(FLIGHT_EXPENSE_CATEGORY_LABEL) as [
  FlightExpenseCategory,
  string,
][];

// Operating-expense category dropdown backed by flight_expense_categories, with
// an in-app dialog to create new categories. Degrades to the four built-ins
// when the table doesn't exist yet (migration 0039 not applied).
export function FlightExpenseSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [custom, setCustom] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from("flight_expense_categories")
      .select("name")
      .order("name")
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        setCustom((data as { name: string }[]).map((c) => c.name));
      });
    return () => {
      active = false;
    };
  }, []);

  // Built-ins first, then any custom names not colliding with a built-in label.
  const builtInValues = new Set(BUILT_INS.map(([v]) => v));
  const options = [
    ...BUILT_INS.map(([v, label]) => ({ value: v, label })),
    ...custom
      .filter((name) => !builtInValues.has(name as FlightExpenseCategory))
      .map((name) => ({ value: name, label: name })),
  ];

  function handleChange(next: string) {
    if (next !== ADD_NEW) {
      onChange(next);
      return;
    }
    setNewName("");
    setAddError(null);
    setAdding(true);
  }

  async function saveNew() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSaving(true);
    setAddError(null);
    const { error } = await supabase
      .from("flight_expense_categories")
      .insert({ name: trimmed });
    setSaving(false);
    // 23505 = already exists, which is fine — just select it.
    if (error && error.code !== "23505") {
      setAddError(error.message);
      return;
    }
    setCustom((c) => (c.includes(trimmed) ? c : [...c, trimmed]));
    onChange(trimmed);
    setAdding(false);
  }

  return (
    <>
      <Select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        required
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
        <option value={ADD_NEW}>➕ Add new category…</option>
      </Select>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAdding(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-sm glass-panel rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              New expense category
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              It will be saved and available in this dropdown from now on.
            </p>
            <div className="mt-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. 🌐 Internet"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveNew();
                  }
                  if (e.key === "Escape") setAdding(false);
                }}
              />
            </div>
            {addError && (
              <div className="mt-3">
                <ErrorNote message={addError} />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={saveNew}
                disabled={saving || !newName.trim()}
              >
                {saving ? "Adding…" : "Add category"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
