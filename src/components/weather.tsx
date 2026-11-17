import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { WEATHER_KINDS, WEATHER_LABELS, WEATHER_SHORT_LABELS, type Weather } from '@/lib/weather';
import { radius, useColors } from '@/theme';

/** Line icon for a weather kind, drawn in the given colour. */
export function WeatherIcon({ kind, size = 20, color }: { kind: Weather; size?: number; color: string }) {
  const s = { stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, fill: 'none' };
  const cloudHigh = 'M7 14.5h10a4 4 0 0 0 .3-8A5.6 5.6 0 0 0 6.5 8.1 3.3 3.3 0 0 0 7 14.5z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={WEATHER_LABELS[kind]}>
      {kind === 'sun' ? (
        <>
          <Circle cx={12} cy={12} r={4} {...s} />
          <Path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" {...s} />
        </>
      ) : kind === 'partly' ? (
        <>
          <Path d="M8.5 3.5v1.6M3.5 8.5h1.6M5 5l1.1 1.1M12 5l-1.1 1.1" {...s} />
          <Path d="M10.6 9.2A3.5 3.5 0 1 0 6.2 12.6" {...s} />
          <Path d="M9 19h8a3.5 3.5 0 0 0 0-7 4.8 4.8 0 0 0-9.2 1.2A2.9 2.9 0 0 0 9 19z" {...s} />
        </>
      ) : kind === 'cloud' ? (
        <Path d="M7 18.5h10a4 4 0 0 0 .3-8 5.6 5.6 0 0 0-10.8 1.6A3.3 3.3 0 0 0 7 18.5z" {...s} />
      ) : kind === 'rain' ? (
        <>
          <Path d={cloudHigh} {...s} />
          <Path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5" {...s} />
        </>
      ) : kind === 'snow' ? (
        <>
          <Path d={cloudHigh} {...s} />
          <Path d="M8 18.5h.01M12 18.5h.01M16 18.5h.01M10 21h.01M14 21h.01" {...s} strokeWidth={2.6} />
        </>
      ) : (
        <>
          <Path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5" {...s} />
          <Path d="M3 14h15a2.5 2.5 0 1 1-2.5 2.5" {...s} />
          <Path d="M3 19h7" {...s} />
        </>
      )}
    </Svg>
  );
}

/** Six-way weather choice. Tapping the selected one clears it. */
export function WeatherPicker({ value, onChange }: { value: Weather | null; onChange: (w: Weather | null) => void }) {
  const c = useColors();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="오늘 날씨" style={styles.row}>
      {WEATHER_KINDS.map((k) => {
        const on = value === k;
        const fg = on ? c.accent : c.ink2;
        return (
          <Pressable
            key={k}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={WEATHER_LABELS[k]}
            onPress={() => onChange(on ? null : k)}
            style={({ pressed }) => [
              styles.chip,
              {
                borderColor: on ? c.accent : c.line,
                borderWidth: on ? 2 : 1,
                backgroundColor: on ? c.accent + '1A' : c.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}>
            <WeatherIcon kind={k} color={fg} />
            <Text style={{ color: fg, fontSize: 11, fontWeight: '500', letterSpacing: -0.3 }} numberOfLines={1}>
              {WEATHER_SHORT_LABELS[k]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small pill showing a stored weather. */
export function WeatherBadge({ kind }: { kind: Weather }) {
  const c = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: c.accent + '1A' }]}>
      <WeatherIcon kind={kind} size={15} color={c.accent} />
      <Text style={{ color: c.accent, fontSize: 12, fontWeight: '500' }}>{WEATHER_LABELS[kind]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
});
