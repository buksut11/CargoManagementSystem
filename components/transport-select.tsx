"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MODE_LABEL } from "@/lib/format";
import { Button, ErrorNote, Input, Select } from "@/components/ui";

const ADD_NEW = "__add_new__";

// Transport / expense-type dropdown backed by the expense_categories table,
// with an in-app dialog to create new types. Falls back to the four built-in
// modes when the table doesn't exist yet (migration 0004 not applied).
export function TransportSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [categories, setCategories] = useState<string[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  useEffect(() => {
    let active = true;
    supabase
      .from("expense_categories")
      .select("name")
      .order("id")
      .then(({ data, error }) => {
        if (!active) return;
        const names =
          !error && data && data.length > 0
            ? (data as { name: string }[]).map((c) => c.name)
            : null;
        setCategories(names);
        // Pre-select the first option so the form is submittable right away.
        if (!valueRef.current) {
          onChange(names ? names[0] : Object.keys(MODE_LABEL)[0]);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = categories
    ? categories.map((name) => ({ value: name, label: name }))
    : Object.entries(MODE_LABEL).map(([v, label]) => ({ value: v, label }));

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
      .from("expense_categories")
      .insert({ name: trimmed });
    setSaving(false);
    // 23505 = already exists, which is fine — just select it.
    if (error && error.code !== "23505") {
      setAddError(error.message);
      return;
    }
    setCategories((c) => (c && !c.includes(trimmed) ? [...c, trimmed] : c));
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
        {categories && <option value={ADD_NEW}>➕ Add new type…</option>}
      </Select>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setAdding(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              New transport / expense type
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              It will be saved and available in this dropdown from now on.
            </p>
            <div className="mt-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. 🚢 Ship"
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
                {saving ? "Adding…" : "Add type"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
