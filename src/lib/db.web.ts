/**
 * Web build of the storage layer (GitHub Pages demo).
 *
 * Same API as `db.ts`, but everything lives in one JSON document in the
 * browser's localStorage instead of SQLite. Data stays in that browser only.
 */
import { mdOf, yearOf, type ISODate, type MonthDay } from './dates';
import type { Anniversary, Entry, EntryInput, EntryKind, Reply } from './db';

export type { Anniversary, Entry, EntryInput, EntryKind, Reply } from './db';

const KEY = 'naite.web.v1';

type Store = {
  entries: Record<ISODate, Entry>;
  replies: Reply[];
  anniversaries: Anniversary[];
  customQuestions: Record<MonthDay, string>;
  settings: Record<string, string>;
  nextId: number;
};

const empty = (): Store => ({ entries: {}, replies: [], anniversaries: [], customQuestions: {}, settings: {}, nextId: 1 });

let store: Store = load();

function load(): Store {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return { ...empty(), ...JSON.parse(raw) };
  } catch {}
  return empty();
}

/** Thrown when the browser refuses to store more (usually too many photos). */
export class StorageFullError extends Error {}

function persist() {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(store));
  } catch (e) {
    throw new StorageFullError((e as Error).message);
  }
}

export function migrate() {}

const byDate = (a: { date: string }, b: { date: string }) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
const all = () => Object.values(store.entries).sort(byDate);

/* ---------- entries ---------- */

export function getEntry(date: ISODate): Entry | null {
  return store.entries[date] ?? null;
}

export function getEntriesByMd(md: MonthDay): Entry[] {
  return all().filter((e) => e.md === md);
}

export function getEntriesBetween(from: ISODate, to: ISODate): Entry[] {
  return all().filter((e) => e.date >= from && e.date <= to);
}

export function getAllEntries(): Entry[] {
  return all();
}

export function getWrittenDates(): { date: ISODate; kind: EntryKind; late: boolean }[] {
  return all().map((e) => ({ date: e.date, kind: e.kind, late: e.late }));
}

export function countEntriesBetween(from: ISODate, to: ISODate): number {
  return all().filter((e) => e.kind === 'entry' && e.date >= from && e.date <= to).length;
}

export function saveEntry(input: EntryInput, now = Date.now()) {
  const prev = store.entries[input.date];
  store.entries[input.date] = {
    ...input,
    md: mdOf(input.date),
    year: yearOf(input.date),
    late: prev ? prev.late : input.late,
    writtenAt: prev?.writtenAt ?? now,
    updatedAt: now,
  };
  persist();
}

export function deleteEntry(date: ISODate) {
  delete store.entries[date];
  store.replies = store.replies.filter((r) => r.date !== date);
  persist();
}

export function tagFrequencies(): { tag: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const e of all()) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n);
}

/* ---------- replies ---------- */

export function getReplies(date: ISODate): Reply[] {
  return store.replies.filter((r) => r.date === date).sort((a, b) => a.createdAt - b.createdAt);
}

export function addReply(date: ISODate, fromYear: number, text: string) {
  store.replies.push({ id: store.nextId++, date, fromYear, text, createdAt: Date.now() });
  persist();
}

export function deleteReply(id: number) {
  store.replies = store.replies.filter((r) => r.id !== id);
  persist();
}

export function countReplies(): number {
  return store.replies.length;
}

/* ---------- anniversaries ---------- */

export function getAnniversaries(): Anniversary[] {
  return [...store.anniversaries].sort((a, b) => a.md.localeCompare(b.md));
}

export function addAnniversary(a: Omit<Anniversary, 'id'>) {
  store.anniversaries.push({ ...a, id: store.nextId++ });
  persist();
}

export function deleteAnniversary(id: number) {
  store.anniversaries = store.anniversaries.filter((a) => a.id !== id);
  persist();
}

/* ---------- custom questions ---------- */

export function getCustomQuestion(md: MonthDay): string | null {
  return store.customQuestions[md] ?? null;
}

export function setCustomQuestion(md: MonthDay, text: string | null) {
  if (text && text.trim()) store.customQuestions[md] = text.trim();
  else delete store.customQuestions[md];
  persist();
}

/* ---------- settings ---------- */

export function getSetting(key: string): string | null {
  return store.settings[key] ?? null;
}

export function setSetting(key: string, value: string) {
  store.settings[key] = value;
  persist();
}

/* ---------- export / reset ---------- */

export function exportAll() {
  return {
    app: 'naite',
    schema: 1,
    exportedAt: new Date().toISOString(),
    settings: Object.entries(store.settings).map(([key, value]) => ({ key, value })),
    entries: all().map((e) => ({ ...e, photo: e.photo?.startsWith('data:') ? null : e.photo })),
    replies: store.replies,
    anniversaries: store.anniversaries,
    customQuestions: Object.entries(store.customQuestions).map(([md, text]) => ({ md, text })),
  };
}

export function wipeAll() {
  store = empty();
  persist();
}
