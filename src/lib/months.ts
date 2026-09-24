const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2022-03-01" → "2022-03" (value for <input type="month">). */
export function toMonthInput(date: string | null): string {
  return date ? date.slice(0, 7) : "";
}

/** "2022-03" → "2022-03-01", "" → null. Throws on anything else. */
export function fromMonthInput(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v)) throw new Error(`Invalid month "${v}"`);
  return `${v}-01`;
}

/** "2022-03-01" → "Mar 2022". */
export function formatMonth(date: string | null): string {
  if (!date) return "";
  const [y, m] = date.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export function formatRange(start: string | null, end: string | null, isCurrent: boolean): string {
  const s = formatMonth(start);
  const e = isCurrent ? "Present" : formatMonth(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "Dates not set";
}
