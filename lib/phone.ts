// Normalises a Somali mobile number to the form the payment gateways expect:
// full international, digits only, no leading "+" or "0" (e.g. "252615000000").
// Accepts "0615…", "615…", "+252615…" and "252615…". Returns null if it can't
// produce a plausible 12-digit 252 number. Shared by every provider (EVC,
// eDahab, Premier) so the number handling is identical across the cards.
export function normalizeSomaliPhone(input: string): string | null {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("252")) {
    // already international
  } else if (digits.startsWith("0")) {
    digits = "252" + digits.slice(1);
  } else if (digits.length === 9) {
    // bare subscriber number like 615000000
    digits = "252" + digits;
  } else {
    return null;
  }
  return /^252\d{9}$/.test(digits) ? digits : null;
}
