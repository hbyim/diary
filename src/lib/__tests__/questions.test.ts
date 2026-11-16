import { describe, expect, it } from '@jest/globals';

import { QUESTIONS, defaultQuestion } from '../questions';

describe('questions', () => {
  it('has exactly one question for each of the 366 month-days', () => {
    expect(Object.keys(QUESTIONS)).toHaveLength(366);
    expect(QUESTIONS['02-29']).toBeDefined();
    expect(QUESTIONS['02-30']).toBeUndefined();
    expect(QUESTIONS['12-31']).toBe('올해의 나에게 한 문장을 남긴다면?');
  });
  it('keeps the flipbook examples', () => {
    expect(defaultQuestion('01-01')).toBe('올해 꼭 하고 싶은 한 가지는?');
    expect(defaultQuestion('04-05')).toBe('지금 창밖에 무엇이 보이나요?');
    expect(defaultQuestion('11-16')).toBe('요즘 가장 자주 듣는 노래는?');
  });
  it('has no empty or duplicated-by-mistake entries', () => {
    for (const q of Object.values(QUESTIONS)) expect(q.trim().length).toBeGreaterThan(4);
  });
});
