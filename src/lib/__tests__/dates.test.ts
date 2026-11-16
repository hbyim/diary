import {
  addYears,
  cellState,
  currentDiaryYear,
  cycleIndex,
  cycleRange,
  dateFor,
  isLocked,
  logicalToday,
  monthMatrix,
  occurrences,
  ringSlot,
  yearIndexInCycle,
} from '../dates';

describe('logicalToday', () => {
  it('counts writing before 03:00 as the previous day', () => {
    expect(logicalToday(new Date(2026, 10, 17, 2, 59))).toBe('2026-11-16');
    expect(logicalToday(new Date(2026, 10, 17, 3, 0))).toBe('2026-11-17');
  });
  it('crosses year boundaries', () => {
    expect(logicalToday(new Date(2027, 0, 1, 1, 0))).toBe('2026-12-31');
  });
});

describe('leap days', () => {
  it('has no Feb 29 in non-leap years', () => {
    expect(dateFor(2027, '02-29')).toBeNull();
    expect(dateFor(2028, '02-29')).toBe('2028-02-29');
    expect(dateFor(2100, '02-29')).toBeNull();
  });
  it('falls back to Feb 28 when adding years', () => {
    expect(addYears('2028-02-29', 1)).toBe('2029-02-28');
  });
  it('shares the Feb 28 ring slot', () => {
    expect(ringSlot('02-29')).toBe(ringSlot('02-28'));
    expect(ringSlot('01-01')).toBe(0);
    expect(ringSlot('12-31')).toBe(364);
  });
});

describe('5-year cycle', () => {
  const start = '2023-01-01';

  it('lists the five cells of a page oldest first', () => {
    expect(occurrences(start, '11-16', '2026-11-16').map((o) => o.date)).toEqual([
      '2023-11-16',
      '2024-11-16',
      '2025-11-16',
      '2026-11-16',
      '2027-11-16',
    ]);
  });

  it('shifts pages before the start month-day into the next calendar year', () => {
    const s = '2026-11-16';
    expect(occurrences(s, '03-01', '2026-11-16').map((o) => o.year)).toEqual([2027, 2028, 2029, 2030, 2031]);
    expect(occurrences(s, '11-16', '2026-11-16').map((o) => o.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(occurrences(s, '12-31', '2026-11-16')[0].date).toBe('2026-12-31');
  });

  it('assigns the year colour by position in the cycle', () => {
    expect(yearIndexInCycle(start, '2023-06-01')).toBe(0);
    expect(yearIndexInCycle(start, '2026-11-16')).toBe(3);
    expect(yearIndexInCycle('2026-11-16', '2027-11-15')).toBe(0);
    expect(yearIndexInCycle('2026-11-16', '2027-11-16')).toBe(1);
  });

  it('starts a new cycle after five years', () => {
    expect(cycleIndex(start, '2027-12-31')).toBe(0);
    expect(cycleIndex(start, '2028-01-01')).toBe(1);
    expect(cycleRange(start, 0)).toEqual({ from: '2023-01-01', to: '2027-12-31' });
    expect(cycleRange(start, 1).from).toBe('2028-01-01');
    expect(occurrences(start, '01-01', '2028-01-01')[0].date).toBe('2028-01-01');
  });

  it('reports the current diary year and elapsed days', () => {
    const y = currentDiaryYear('2026-11-16', '2026-11-16');
    expect(y).toEqual({ from: '2026-11-16', to: '2027-11-15', elapsed: 1, index: 0 });
    expect(currentDiaryYear(start, '2026-11-16').elapsed).toBe(320);
  });
});

describe('cell states', () => {
  const start = '2023-01-01';
  const today = '2026-11-16';
  it('classifies each cell', () => {
    expect(cellState('2026-11-16', today, start)).toBe('today');
    expect(cellState('2027-11-16', today, start)).toBe('future');
    expect(cellState('2026-11-09', today, start)).toBe('backfill');
    expect(cellState('2026-11-08', today, start)).toBe('past');
    expect(cellState('2022-11-16', today, start)).toBe('before-start');
    expect(cellState(null, today, start)).toBe('none');
  });
});

describe('7-day lock', () => {
  it('locks entries a week after first save', () => {
    const t0 = Date.UTC(2026, 10, 1);
    expect(isLocked(t0, t0 + 7 * 86_400_000)).toBe(false);
    expect(isLocked(t0, t0 + 7 * 86_400_000 + 1)).toBe(true);
  });
});

describe('monthMatrix', () => {
  it('pads to full weeks starting on Sunday', () => {
    const m = monthMatrix(2026, 11); // Nov 1 2026 is a Sunday
    expect(m[0]).toBe('2026-11-01');
    expect(m.length % 7).toBe(0);
    expect(m.filter(Boolean)).toHaveLength(30);
  });
});
