import { CareerEntry } from "./types";
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export function monthIndex(value?: string) {
  if (!value || !/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  return year * 12 + month - 1;
}
export function monthLabel(index: number) {
  return `${months[index % 12]} ${Math.floor(index / 12)}`;
}
function legacyMonth(text: string) {
  const m = text.trim().match(/^([A-Za-z]{3,9})\s+['’]?(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = months.findIndex(
    (v) => v.toLowerCase() === m[1].slice(0, 3).toLowerCase(),
  );
  if (month < 0) return null;
  const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return monthIndex(`${year}-${String(month + 1).padStart(2, "0")}`);
}
export function employmentDates(row: CareerEntry, now = new Date()) {
  let start = monthIndex(row.startMonth),
    end = row.current
      ? now.getFullYear() * 12 + now.getMonth()
      : monthIndex(row.endMonth);
  let current = !!row.current;
  if (start === null && row.period) {
    const pair = row.period.split(/\s+(?:to|[-–—])\s+/i);
    if (pair.length === 2) {
      start = legacyMonth(pair[0]);
      current = /^(present|current|till date)$/i.test(pair[1].trim());
      end = current
        ? now.getFullYear() * 12 + now.getMonth()
        : legacyMonth(pair[1]);
    }
  }
  return start !== null && end !== null && end >= start
    ? { start, end, current }
    : null;
}
export function employmentPeriod(row: CareerEntry, now = new Date()) {
  const d = employmentDates(row, now);
  if (!d) return row.period || "Dates not specified";
  const duration = d.end - d.start;
  return `${monthLabel(d.start)} – ${d.current ? "Present" : monthLabel(d.end)} · ${Math.floor(duration / 12)}y ${duration % 12}m`;
}
export function careerSegments(rows: CareerEntry[], now = new Date()) {
  const dated = rows
    .map((row, index) => ({ row, index, dates: employmentDates(row, now) }))
    .filter(
      (
        r,
      ): r is typeof r & {
        dates: NonNullable<ReturnType<typeof employmentDates>>;
      } => r.dates !== null,
    )
    .sort((a, b) => a.dates.start - b.dates.start);
  const gaps: { start: number; end: number }[] = [];
  if (dated.length === rows.length && dated.length) {
    let end = dated[0].dates.end;
    for (const next of dated.slice(1)) {
      if (next.dates.start - end > 1)
        gaps.push({ start: end, end: next.dates.start });
      end = Math.max(end, next.dates.end);
    }
  }
  return { dated, gaps };
}