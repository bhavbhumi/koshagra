/**
 * Centralised money & date formatters. All UI surfaces must route through
 * these helpers so numerals and dates render consistently in Indian style
 * (Book 1 §3.3 — IBM Plex Mono for figures, en-IN grouping, ₹ glyph, and
 * non-ISO short dates like "20 Jul 2026").
 */
export { formatINR } from "./estate";

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
};

const DATETIME_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

/** "20 Jul 2026" — en-IN short date. Renders "—" for null/invalid. */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", DATE_OPTS);
}

/** "20 Jul 2026, 14:32" — en-IN short date + 24h time. */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", DATETIME_OPTS);
}

/** Legacy alias — several routes still import `formatEnInDate`. */
export const formatEnInDate = formatDate;