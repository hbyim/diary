import * as SQLite from 'expo-sqlite';

import { mdOf, yearOf, type ISODate, type MonthDay } from './dates';
import { toWeather, type Weather } from './weather';

/**
 * Local-first storage. Every record lives in one SQLite file on the device
 * (`naite.db`); nothing is sent to a server. Schema changes go through
 * `MIGRATIONS` and are tracked with `PRAGMA user_version`.
 */
export const db = SQLite.openDatabaseSync('naite.db');

const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS entries (
    date        TEXT PRIMARY KEY NOT NULL,      -- YYYY-MM-DD (local)
    md          TEXT NOT NULL,                  -- MM-DD, the page
    year        INTEGER NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'entry',  -- 'entry' | 'memo' (memory note for an old missed day)
    question    TEXT NOT NULL DEFAULT '',       -- question text as shown when written
    text        TEXT NOT NULL DEFAULT '',
    mood        INTEGER,                        -- 1..5
    tags        TEXT NOT NULL DEFAULT '[]',     -- JSON array of strings
    photo       TEXT,                           -- file URI inside the app's document directory
    late        INTEGER NOT NULL DEFAULT 0,     -- 1 when written after the day itself
    written_at  INTEGER NOT NULL,               -- ms epoch of first save; drives the 7-day lock
    updated_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_entries_md ON entries(md);
  CREATE TABLE IF NOT EXISTS replies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,                  -- entry being replied to
    from_year   INTEGER NOT NULL,               -- the year the reply was written in
    text        TEXT NOT NULL,
    created_at  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_replies_date ON replies(date);
  CREATE TABLE IF NOT EXISTS anniversaries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    md          TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'exact',  -- 'exact' | 'range'
    range_days  INTEGER NOT NULL DEFAULT 0,
    source_date TEXT,                           -- the entry it came from, if any
    created_at  INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS custom_questions (
    md          TEXT PRIMARY KEY NOT NULL,
    text        TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY NOT NULL,
    value       TEXT NOT NULL
  );
  `,
  // 2: the day's weather, picked by the writer (sun | partly | cloud | rain | snow | wind).
  `ALTER TABLE entries ADD COLUMN weather TEXT;`,
];

export function migrate() {
  db.execSync('PRAGMA journal_mode = WAL;');
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    db.withTransactionSync(() => {
      db.execSync(MIGRATIONS[version]);
      db.execSync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}

migrate();

/* ---------- entries ---------- */

export type EntryKind = 'entry' | 'memo';

export type Entry = {
  date: ISODate;
  md: MonthDay;
  year: number;
  kind: EntryKind;
  question: string;
  text: string;
  mood: number | null;
  weather: Weather | null;
  tags: string[];
  photo: string | null;
  late: boolean;
  writtenAt: number;
  updatedAt: number;
};

type EntryRow = Omit<Entry, 'tags' | 'late' | 'writtenAt' | 'updatedAt' | 'weather'> & {
  weather: string | null;
  tags: string;
  late: number;
  written_at: number;
  updated_at: number;
};

function fromRow(r: EntryRow): Entry {
  let tags: string[] = [];
  try {
    tags = JSON.parse(r.tags);
  } catch {}
  return {
    date: r.date,
    md: r.md,
    year: r.year,
    kind: r.kind,
    question: r.question,
    text: r.text,
    mood: r.mood,
    weather: toWeather(r.weather),
    tags,
    photo: r.photo,
    late: !!r.late,
    writtenAt: r.written_at,
    updatedAt: r.updated_at,
  };
}

export function getEntry(date: ISODate): Entry | null {
  const r = db.getFirstSync<EntryRow>('SELECT * FROM entries WHERE date = ?', date);
  return r ? fromRow(r) : null;
}

export function getEntriesByMd(md: MonthDay): Entry[] {
  return db.getAllSync<EntryRow>('SELECT * FROM entries WHERE md = ? ORDER BY date', md).map(fromRow);
}

export function getEntriesBetween(from: ISODate, to: ISODate): Entry[] {
  return db
    .getAllSync<EntryRow>('SELECT * FROM entries WHERE date >= ? AND date <= ? ORDER BY date', from, to)
    .map(fromRow);
}

export function getAllEntries(): Entry[] {
  return db.getAllSync<EntryRow>('SELECT * FROM entries ORDER BY date').map(fromRow);
}

export type WrittenDate = { date: ISODate; kind: EntryKind; late: boolean; weather: Weather | null };

/** Lightweight list of written dates for the ring and calendar. */
export function getWrittenDates(): WrittenDate[] {
  return db
    .getAllSync<{ date: string; kind: EntryKind; late: number; weather: string | null }>(
      'SELECT date, kind, late, weather FROM entries ORDER BY date',
    )
    .map((r) => ({ date: r.date, kind: r.kind, late: !!r.late, weather: toWeather(r.weather) }));
}

export function countEntriesBetween(from: ISODate, to: ISODate): number {
  return (
    db.getFirstSync<{ n: number }>(
      "SELECT COUNT(*) AS n FROM entries WHERE kind = 'entry' AND date >= ? AND date <= ?",
      from,
      to,
    )?.n ?? 0
  );
}

export type EntryInput = {
  date: ISODate;
  kind: EntryKind;
  question: string;
  text: string;
  mood: number | null;
  weather: Weather | null;
  tags: string[];
  photo: string | null;
  late: boolean;
};

/** Inserts or updates; keeps the original `written_at` so the 7-day lock starts at the first save. */
export function saveEntry(input: EntryInput, now = Date.now()) {
  db.runSync(
    `INSERT INTO entries (date, md, year, kind, question, text, mood, weather, tags, photo, late, written_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       kind = excluded.kind, question = excluded.question, text = excluded.text, mood = excluded.mood, weather = excluded.weather,
       tags = excluded.tags, photo = excluded.photo, updated_at = excluded.updated_at`,
    input.date,
    mdOf(input.date),
    yearOf(input.date),
    input.kind,
    input.question,
    input.text,
    input.mood,
    input.weather,
    JSON.stringify(input.tags),
    input.photo,
    input.late ? 1 : 0,
    now,
    now,
  );
}

export function deleteEntry(date: ISODate) {
  db.runSync('DELETE FROM entries WHERE date = ?', date);
  db.runSync('DELETE FROM replies WHERE date = ?', date);
}

/** Tags used so far, most frequent first. */
export function tagFrequencies(): { tag: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const r of db.getAllSync<{ tags: string }>("SELECT tags FROM entries WHERE tags != '[]'")) {
    try {
      for (const t of JSON.parse(r.tags) as string[]) counts.set(t, (counts.get(t) ?? 0) + 1);
    } catch {}
  }
  return [...counts.entries()].map(([tag, n]) => ({ tag, n })).sort((a, b) => b.n - a.n);
}

/* ---------- replies ---------- */

export type Reply = { id: number; date: ISODate; fromYear: number; text: string; createdAt: number };

export function getReplies(date: ISODate): Reply[] {
  return db
    .getAllSync<{ id: number; date: string; from_year: number; text: string; created_at: number }>(
      'SELECT * FROM replies WHERE date = ? ORDER BY created_at',
      date,
    )
    .map((r) => ({ id: r.id, date: r.date, fromYear: r.from_year, text: r.text, createdAt: r.created_at }));
}

export function addReply(date: ISODate, fromYear: number, text: string) {
  db.runSync('INSERT INTO replies (date, from_year, text, created_at) VALUES (?, ?, ?, ?)', date, fromYear, text, Date.now());
}

export function deleteReply(id: number) {
  db.runSync('DELETE FROM replies WHERE id = ?', id);
}

export function countReplies(): number {
  return db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM replies')?.n ?? 0;
}

/* ---------- anniversaries ---------- */

export type Anniversary = {
  id: number;
  title: string;
  md: MonthDay;
  kind: 'exact' | 'range';
  rangeDays: number;
  sourceDate: ISODate | null;
};

export function getAnniversaries(): Anniversary[] {
  return db
    .getAllSync<{ id: number; title: string; md: string; kind: 'exact' | 'range'; range_days: number; source_date: string | null }>(
      'SELECT * FROM anniversaries ORDER BY md',
    )
    .map((r) => ({ id: r.id, title: r.title, md: r.md, kind: r.kind, rangeDays: r.range_days, sourceDate: r.source_date }));
}

export function addAnniversary(a: Omit<Anniversary, 'id'>) {
  db.runSync(
    'INSERT INTO anniversaries (title, md, kind, range_days, source_date, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    a.title,
    a.md,
    a.kind,
    a.rangeDays,
    a.sourceDate,
    Date.now(),
  );
}

export function deleteAnniversary(id: number) {
  db.runSync('DELETE FROM anniversaries WHERE id = ?', id);
}

/* ---------- custom questions ---------- */

export function getCustomQuestion(md: MonthDay): string | null {
  return db.getFirstSync<{ text: string }>('SELECT text FROM custom_questions WHERE md = ?', md)?.text ?? null;
}

export function setCustomQuestion(md: MonthDay, text: string | null) {
  if (text && text.trim()) {
    db.runSync('INSERT OR REPLACE INTO custom_questions (md, text) VALUES (?, ?)', md, text.trim());
  } else {
    db.runSync('DELETE FROM custom_questions WHERE md = ?', md);
  }
}

/* ---------- settings ---------- */

export function getSetting(key: string): string | null {
  return db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', key, value);
}

/* ---------- export / reset ---------- */

export function exportAll() {
  return {
    app: 'naite',
    schema: MIGRATIONS.length,
    exportedAt: new Date().toISOString(),
    settings: db.getAllSync('SELECT * FROM settings'),
    entries: getAllEntries(),
    replies: db.getAllSync('SELECT * FROM replies ORDER BY date, created_at'),
    anniversaries: getAnniversaries(),
    customQuestions: db.getAllSync('SELECT * FROM custom_questions'),
  };
}

export function wipeAll() {
  db.withTransactionSync(() => {
    db.execSync('DELETE FROM entries; DELETE FROM replies; DELETE FROM anniversaries; DELETE FROM custom_questions; DELETE FROM settings;');
  });
}
