/**
 * Date helpers for the 5-year diary.
 *
 * Everything is keyed by a local calendar date string `YYYY-MM-DD` (ISODate).
 * A "page" is a month-day (`MM-DD`), and each page has five cells: one per
 * year of the current 5-year cycle.
 */

export type ISODate = string;
export type MonthDay = string;

export const CYCLE_YEARS = 5;
/** Writing before this hour counts toward the previous day. */
export const DAY_CUTOFF_HOUR = 3;
/** Days after which an entry is locked, and how far back a missed day can still be filled. */
export const EDIT_WINDOW_DAYS = 7;
export const BACKFILL_DAYS = 7;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parses to local noon so DST shifts never move the calendar day. */
export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export const mdOf = (iso: ISODate): MonthDay => iso.slice(5);
export const yearOf = (iso: ISODate): number => Number(iso.slice(0, 4));
export const monthOf = (iso: ISODate): number => Number(iso.slice(5, 7));
export const dayOf = (iso: ISODate): number => Number(iso.slice(8, 10));

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** The calendar date for `md` in `year`, or null for Feb 29 in a non-leap year. */
export function dateFor(year: number, md: MonthDay): ISODate | null {
  if (md === '02-29' && !isLeap(year)) return null;
  return `${year}-${md}`;
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Same month-day `n` years later; Feb 29 falls back to Feb 28. */
export function addYears(iso: ISODate, n: number): ISODate {
  const y = yearOf(iso) + n;
  return dateFor(y, mdOf(iso)) ?? `${y}-02-28`;
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);
}

export function weekdayKo(iso: ISODate): string {
  return WEEKDAYS[parseISO(iso).getDay()];
}

/** Today's diary date: before 03:00 still counts as yesterday. */
export function logicalToday(now: Date = new Date()): ISODate {
  const d = new Date(now);
  if (d.getHours() < DAY_CUTOFF_HOUR) d.setDate(d.getDate() - 1);
  return toISO(d);
}

export function formatKo(iso: ISODate): string {
  return `${monthOf(iso)}월 ${dayOf(iso)}일`;
}

/** Number of full diary years between the start date and `ref` (0-based). */
export function yearsSinceStart(start: ISODate, ref: ISODate): number {
  let years = yearOf(ref) - yearOf(start);
  if (mdOf(ref) < mdOf(start)) years -= 1;
  return Math.max(0, years);
}

/** Index of the 5-year cycle that contains `ref` (0 = first five years). */
export function cycleIndex(start: ISODate, ref: ISODate): number {
  return Math.floor(yearsSinceStart(start, ref) / CYCLE_YEARS);
}

/** 0..4: which year of its cycle `ref` falls in. Drives the year colour. */
export function yearIndexInCycle(start: ISODate, ref: ISODate): number {
  return yearsSinceStart(start, ref) % CYCLE_YEARS;
}

export function cycleRange(start: ISODate, cycle: number): { from: ISODate; to: ISODate } {
  const from = addYears(start, cycle * CYCLE_YEARS);
  const to = addDays(addYears(start, (cycle + 1) * CYCLE_YEARS), -1);
  return { from, to };
}

export type Occurrence = {
  /** 0..4 position inside the cycle (colour index). */
  k: number;
  year: number;
  /** null when the page is Feb 29 and that year has none. */
  date: ISODate | null;
};

/** The five cells of page `md` in the cycle that contains `ref`. */
export function occurrences(start: ISODate, md: MonthDay, ref: ISODate): Occurrence[] {
  const cycle = cycleIndex(start, ref);
  const base = yearOf(start) + cycle * CYCLE_YEARS + (md < mdOf(start) ? 1 : 0);
  return Array.from({ length: CYCLE_YEARS }, (_, k) => ({
    k,
    year: base + k,
    date: dateFor(base + k, md),
  }));
}

export type CellState =
  | 'future'
  | 'today'
  /** A recent missed day that can still be written in full. */
  | 'backfill'
  /** Older than the backfill window: only a short memory note is allowed. */
  | 'past'
  | 'before-start'
  | 'none';

export function cellState(date: ISODate | null, today: ISODate, start: ISODate): CellState {
  if (!date) return 'none';
  if (date < start) return 'before-start';
  if (date === today) return 'today';
  if (date > today) return 'future';
  return diffDays(date, today) <= BACKFILL_DAYS ? 'backfill' : 'past';
}

/** An entry can be edited for 7 days after it was first written. */
export function isLocked(writtenAt: number, now: number = Date.now()): boolean {
  return now - writtenAt > EDIT_WINDOW_DAYS * 86_400_000;
}

/** Start of the diary year that contains `today`, and how many days of it have passed. */
export function currentDiaryYear(start: ISODate, today: ISODate) {
  const from = addYears(start, yearsSinceStart(start, today));
  const to = addDays(addYears(from, 1), -1);
  return { from, to, elapsed: diffDays(from, today) + 1, index: yearIndexInCycle(start, today) };
}

/** 0-based day of the year used to place a date on the ring (Feb 29 shares Feb 28's slot). */
export function ringSlot(md: MonthDay): number {
  const ref = md === '02-29' ? '2001-02-28' : `2001-${md}`;
  return diffDays('2001-01-01', ref);
}

export function monthMatrix(year: number, month: number): (ISODate | null)[] {
  const first = new Date(year, month - 1, 1, 12);
  const days = new Date(year, month, 0, 12).getDate();
  const cells: (ISODate | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad2(month)}-${pad2(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
