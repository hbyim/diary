import { describe, expect, it } from '@jest/globals';

import { WEATHER_KINDS, WEATHER_LABELS, isWeather, toWeather } from '../weather';

describe('weather', () => {
  it('has a Korean label for each of the six kinds', () => {
    expect(WEATHER_KINDS).toEqual(['sun', 'partly', 'cloud', 'rain', 'snow', 'wind']);
    for (const k of WEATHER_KINDS) expect(WEATHER_LABELS[k].length).toBeGreaterThan(0);
  });
  it('turns unknown or missing stored values into null', () => {
    expect(toWeather('rain')).toBe('rain');
    expect(toWeather(null)).toBeNull();
    expect(toWeather(undefined)).toBeNull();
    expect(toWeather('fog')).toBeNull();
    expect(isWeather('snow')).toBe(true);
  });
});
