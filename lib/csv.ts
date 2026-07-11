type Cell = string | number | null | undefined;

export function downloadCsv(filename: string, rows: Cell[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell == null) return "";
          // Numbers are never spreadsheet formulas, so pass them through
          // untouched (avoids mangling e.g. negative values into text).
          if (typeof cell === "number") {
            const n = String(cell);
            return /[",\n]/.test(n) ? `"${n.replace(/"/g, '""')}"` : n;
          }
          const raw = String(cell);
          // Neutralize formula injection: a text cell that begins with = + - @
          // (or a leading tab/CR) is treated as a live formula by Excel/Sheets.
          // Prefixing a single quote forces it to be read as plain text.
          const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  // BOM so Excel opens it with correct encoding.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
