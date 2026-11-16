/** Lightweight on-device text helpers. Nothing here leaves the device. */

// Common Korean particles and endings stripped from the end of a word.
const SUFFIXES = [
  '에서는', '으로는', '에게서', '까지는', '이라도', '에서', '에게', '으로', '까지', '부터', '처럼', '보다', '이랑', '하고',
  '은', '는', '이', '가', '을', '를', '에', '로', '도', '만', '의', '와', '과', '랑', '야', '아',
];

const STOP = new Set([
  '그리고', '그런데', '하지만', '그래서', '오늘', '정말', '너무', '진짜', '그냥', '조금', '많이', '아주', '이제', '다시',
  '했다', '한다', '하는', '있다', '없다', '있는', '없는', '같다', '같은', '것', '수', '때', '더', '좀', '안', '못',
]);

export function stem(word: string): string {
  let w = word;
  for (const s of SUFFIXES) {
    if (w.length > s.length + 1 && w.endsWith(s)) {
      w = w.slice(0, -s.length);
      break;
    }
  }
  return w;
}

export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^0-9a-z가-힣]+/)) {
    if (!raw) continue;
    const w = stem(raw);
    if (w.length < 2 || STOP.has(w) || STOP.has(raw)) continue;
    out.add(w);
  }
  return out;
}

/** Words in `today` that also appear in any of the past texts, most shared first. */
export function overlapWords(today: string, past: string[], limit = 5): string[] {
  const mine = tokenize(today);
  const counts = new Map<string, number>();
  for (const p of past) {
    for (const w of tokenize(p)) if (mine.has(w)) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([w]) => w);
}

export type TaggedEntry = { year: number; tags: string[] };

/** Tags that appear in two or more different years, with the years they appeared in. */
export function repeatedTags(entries: TaggedEntry[]): { tag: string; years: number[] }[] {
  const map = new Map<string, Set<number>>();
  for (const e of entries) for (const t of e.tags) {
    if (!map.has(t)) map.set(t, new Set());
    map.get(t)!.add(e.year);
  }
  return [...map.entries()]
    .filter(([, ys]) => ys.size >= 2)
    .map(([tag, ys]) => ({ tag, years: [...ys].sort() }))
    .sort((a, b) => b.years.length - a.years.length || a.tag.localeCompare(b.tag));
}

/** True when the given years end in an unbroken run of consecutive years (e.g. 2024, 2025). */
export function consecutiveRun(years: number[]): number {
  const s = [...new Set(years)].sort((a, b) => b - a);
  let run = s.length ? 1 : 0;
  for (let i = 1; i < s.length && s[i] === s[i - 1] - 1; i++) run++;
  return run;
}

export function normalizeTag(input: string): string {
  return input.replace(/^#+/, '').replace(/\s+/g, '').slice(0, 20);
}

export function firstLine(text: string, max = 40): string {
  const line = text.split('\n').find((l) => l.trim()) ?? '';
  return line.length > max ? line.slice(0, max) + '…' : line;
}
