import type { Role } from "./types";

/** Resume order: current roles first, then most recent end date, then most recent start. */
export function sortRoles<T extends Pick<Role, "is_current" | "end_month" | "start_month">>(a: T, b: T): number {
  if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
  const ae = a.end_month ?? "";
  const be = b.end_month ?? "";
  if (ae !== be) return be.localeCompare(ae);
  return (b.start_month ?? "").localeCompare(a.start_month ?? "");
}

/** First instant of the current calendar month (UTC) for the monthly generation count. */
export function monthStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}
