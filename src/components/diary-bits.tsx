import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useState } from 'react';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { normalizeTag } from '@/lib/analysis';
import { fonts, radius, space, useColors } from '@/theme';

import { Chip, T } from './ui';

export const MOOD_LABELS = ['아주 나쁨', '나쁨', '보통', '좋음', '아주 좋음'];

export function MoodPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {[1, 2, 3, 4, 5].map((m) => {
        const sel = value === m;
        return (
          <Pressable
            key={m}
            accessibilityLabel={`기분 ${m}, ${MOOD_LABELS[m - 1]}`}
            accessibilityState={{ selected: sel }}
            onPress={() => onChange(sel ? null : m)}
            style={[
              styles.mood,
              { borderColor: sel ? c.accent : c.line, backgroundColor: sel ? c.accent + '22' : 'transparent' },
            ]}>
            <T kind="mono" color={sel ? c.accent : c.ink3} style={{ fontSize: 15 }}>
              {m}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TagEditor({
  tags,
  onChange,
  suggestions,
  color,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  suggestions: string[];
  color: string;
}) {
  const c = useColors();
  const [draft, setDraft] = useState('');
  const add = (raw: string) => {
    const t = normalizeTag(raw);
    if (t && !tags.includes(t) && tags.length < 5) onChange([...tags, t]);
    setDraft('');
  };
  const rest = suggestions.filter((s) => !tags.includes(s)).slice(0, 8);
  return (
    <View style={{ gap: space.sm }}>
      <View style={styles.wrap}>
        {tags.map((t) => (
          <Chip key={t} label={`#${t}  ×`} color={color} onPress={() => onChange(tags.filter((x) => x !== t))} />
        ))}
        {tags.length < 5 ? (
          <TextInput
            value={draft}
            onChangeText={(v) => (/[\s,]$/.test(v) ? add(v) : setDraft(v))}
            onSubmitEditing={() => add(draft)}
            placeholder="+ 오늘 한 일"
            placeholderTextColor={c.ink3}
            returnKeyType="done"
            submitBehavior="submit"
            style={[styles.tagInput, { color: c.ink, borderColor: c.line }]}
            accessibilityLabel="오늘 한 일 태그 추가"
          />
        ) : null}
      </View>
      {rest.length ? (
        <View style={styles.wrap}>
          {rest.map((s) => (
            <Chip key={s} label={`#${s}`} selected={false} onPress={() => add(s)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** One coloured cell of the "today" stack. */
export function YearCell({
  color,
  year,
  meta,
  children,
  variant = 'past',
  onPress,
}: {
  color: string;
  year: number | string;
  meta?: string;
  children: React.ReactNode;
  variant?: 'now' | 'past' | 'future' | 'blank';
  onPress?: () => void;
}) {
  const c = useColors();
  const border =
    variant === 'now'
      ? { borderWidth: 1.5, borderColor: color, backgroundColor: 'transparent' }
      : variant === 'future'
        ? { borderWidth: 1.5, borderColor: c.line, borderStyle: 'dashed' as const, backgroundColor: 'transparent' }
        : { borderWidth: 0, backgroundColor: c.surface2 };
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.cell, border, { borderLeftWidth: 4, borderLeftColor: variant === 'future' ? c.line : color, opacity: pressed ? 0.7 : 1 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <T kind="mono" color={variant === 'future' ? c.ink3 : color} style={{ fontWeight: '600' }}>
          {year}
        </T>
        {meta ? <T kind="small">{meta}</T> : null}
      </View>
      {children}
    </Pressable>
  );
}

/** Mood on one date across years. */
export function MoodChart({ points, width }: { points: { year: number; mood: number; color: string }[]; width: number }) {
  const c = useColors();
  const h = 96;
  const left = 22;
  const right = 14;
  const top = 12;
  const bottom = 22;
  const x = (i: number) => left + (points.length === 1 ? (width - left - right) / 2 : (i * (width - left - right)) / (points.length - 1));
  const y = (m: number) => top + ((5 - m) * (h - top - bottom)) / 4;
  return (
    <Svg width={width} height={h}>
      {[5, 1].map((m) => (
        <Line key={m} x1={left} x2={width - right} y1={y(m)} y2={y(m)} stroke={c.line} strokeWidth={1} />
      ))}
      <SvgText x={4} y={y(5) + 4} fontSize={10} fill={c.ink3} fontFamily={fonts.mono}>5</SvgText>
      <SvgText x={4} y={y(1) + 4} fontSize={10} fill={c.ink3} fontFamily={fonts.mono}>1</SvgText>
      {points.length > 1 ? (
        <Polyline points={points.map((p, i) => `${x(i)},${y(p.mood)}`).join(' ')} fill="none" stroke={c.ink3} strokeWidth={1.5} />
      ) : null}
      {points.map((p, i) => (
        <Circle key={p.year} cx={x(i)} cy={y(p.mood)} r={i === points.length - 1 ? 6 : 4.5} fill={p.color} />
      ))}
      {points.map((p, i) => (
        <SvgText key={`t${p.year}`} x={x(i)} y={h - 6} fontSize={10} fill={c.ink3} textAnchor="middle" fontFamily={fonts.mono}>
          {String(p.year).slice(2)}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  mood: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tagInput: { minWidth: 110, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontSize: 13 },
  cell: { borderRadius: radius.sm, padding: space.md, gap: 4 },
});
