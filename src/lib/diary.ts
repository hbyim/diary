import { getCustomQuestion, getEntriesByMd, type Entry } from './db';
import { cellState, mdOf, occurrences, type CellState, type ISODate, type MonthDay } from './dates';
import { FREE_QUESTION, defaultQuestion } from './questions';
import type { QuestionMode } from './settings';

export function questionFor(md: MonthDay, mode: QuestionMode): string {
  return getCustomQuestion(md) ?? (mode === 'free' ? FREE_QUESTION : defaultQuestion(md));
}

export type Cell = {
  k: number;
  year: number;
  date: ISODate | null;
  state: CellState;
  entry: Entry | null;
};

/** The five cells of the page for `date`, in cycle order (oldest first). */
export function pageCells(start: ISODate, date: ISODate, today: ISODate): Cell[] {
  const md = mdOf(date);
  const byDate = new Map(getEntriesByMd(md).map((e) => [e.date, e]));
  return occurrences(start, md, today).map((o) => ({
    ...o,
    state: cellState(o.date, today, start),
    entry: o.date ? (byDate.get(o.date) ?? null) : null,
  }));
}

export function relativeYears(year: number, todayYear: number): string {
  const d = todayYear - year;
  if (d === 0) return '올해';
  if (d > 0) return `${d}년 전`;
  return `${-d}년 후`;
}
