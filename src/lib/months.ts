const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2022-03" (or "2022-03-01") → "Mar 2022". */
export function formatMonth(date: string | null): string {
  if (!date) return "";
  const [y, m] = date.split("-");
  const name = MONTHS[Number(m) - 1];
  return name && y ? `${name} ${y}` : "";
}

export function formatRange(start: string | null, end: string | null, isCurrent: boolean): string {
  const s = formatMonth(start);
  const e = isCurrent ? "Present" : formatMonth(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || "";
}
