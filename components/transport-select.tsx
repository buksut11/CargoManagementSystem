"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MODE_LABEL } from "@/lib/format";
import { Select } from "@/components/ui";

const ADD_NEW = "__add_new__";

// Transport / expense-type dropdown backed by the expense_categories table,
// with an inline "add new type" option. Falls back to the four built-in
// modes when the table doesn't exist yet (migration 0004 not applied).
export function TransportSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [categories, setCategories] = useState<string[] | null>(null);
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

  async function handleChange(next: string) {
    if (next !== ADD_NEW) {
      onChange(next);
      return;
    }
    const name = window.prompt("Name of the new transport / expense type:");
    const trimmed = name?.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from("expense_categories")
      .insert({ name: trimmed });
    // 23505 = already exists, which is fine — just select it.
    if (error && error.code !== "23505") {
      alert(error.message);
      return;
    }
    setCategories((c) =>
      c && !c.includes(trimmed) ? [...c, trimmed] : c,
    );
    onChange(trimmed);
  }

  return (
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
  );
}
