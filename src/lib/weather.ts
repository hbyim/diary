/** Weather the writer picks for the day. Optional; older entries have none. */
export const WEATHER_KINDS = ['sun', 'partly', 'cloud', 'rain', 'snow', 'wind'] as const;

export type Weather = (typeof WEATHER_KINDS)[number];

export const WEATHER_LABELS: Record<Weather, string> = {
  sun: '맑음',
  partly: '구름 조금',
  cloud: '흐림',
  rain: '비',
  snow: '눈',
  wind: '바람',
};

/** Shorter labels for the six-way picker, where each choice is a narrow column. */
export const WEATHER_SHORT_LABELS: Record<Weather, string> = { ...WEATHER_LABELS, partly: '구름조금' };

export function isWeather(v: unknown): v is Weather {
  return typeof v === 'string' && (WEATHER_KINDS as readonly string[]).includes(v);
}

/** Reads a stored value; anything unknown becomes null. */
export function toWeather(v: unknown): Weather | null {
  return isWeather(v) ? v : null;
}
