import { consecutiveRun, firstLine, normalizeTag, overlapWords, repeatedTags, tokenize } from '../analysis';

describe('tokenize', () => {
  it('strips particles and stop words', () => {
    const t = tokenize('퇴근길에 이어폰을 꽂으면 그냥 노래가 좋다');
    expect(t.has('퇴근길')).toBe(true);
    expect(t.has('이어폰')).toBe(true);
    expect(t.has('노래')).toBe(true);
    expect(t.has('그냥')).toBe(false);
  });
});

describe('overlapWords', () => {
  it('finds words shared with past years, most shared first', () => {
    const words = overlapWords('퇴근길에 이어폰으로 노래를 들었다', [
      '출근길마다 같은 노래. 이어폰이 고장났다',
      '라디오에서 나온 노래',
    ]);
    expect(words[0]).toBe('노래');
    expect(words).toContain('이어폰');
    expect(words).not.toContain('퇴근길');
  });
});

describe('repeatedTags', () => {
  it('keeps tags seen in two or more different years', () => {
    const r = repeatedTags([
      { year: 2024, tags: ['김장'] },
      { year: 2025, tags: ['김장', '이직'] },
      { year: 2025, tags: ['이직'] },
    ]);
    expect(r).toEqual([{ tag: '김장', years: [2024, 2025] }]);
  });
  it('counts a consecutive run ending at the latest year', () => {
    expect(consecutiveRun([2023, 2024, 2025])).toBe(3);
    expect(consecutiveRun([2023, 2025])).toBe(1);
    expect(consecutiveRun([])).toBe(0);
  });
});

describe('helpers', () => {
  it('normalizes tags', () => {
    expect(normalizeTag('#김 장 ')).toBe('김장');
  });
  it('takes the first non-empty line', () => {
    expect(firstLine('\n첫 줄\n둘째 줄')).toBe('첫 줄');
  });
});
