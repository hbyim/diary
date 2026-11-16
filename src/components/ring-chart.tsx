import { useMemo } from 'react';
import { Pressable, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';

import {
  CYCLE_YEARS,
  cycleIndex,
  dateFor,
  mdOf,
  pad2,
  ringSlot,
  yearIndexInCycle,
  yearOf,
  type ISODate,
  type MonthDay,
} from '@/lib/dates';
import { fonts, useColors } from '@/theme';

const SLOTS = 365;

/** MM-DD for each of the 365 ring slots (Feb 29 shares Feb 28's slot). */
const SLOT_MD: MonthDay[] = Array.from({ length: SLOTS }, (_, i) => {
  const d = new Date(2001, 0, 1 + i, 12);
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
});

type Status = 'filled' | 'empty' | 'future';

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

const angleOf = (slot: number) => (slot / SLOTS) * Math.PI * 2 - Math.PI / 2;

/**
 * Five concentric rings, one per year of the current cycle (oldest inside).
 * Each ring has 365 slots at fixed angles, so the same date lines up across years.
 */
export function RingChart({
  size,
  start,
  today,
  written,
  highlight,
  centerLabel,
  onPressDate,
}: {
  size: number;
  start: ISODate;
  today: ISODate;
  written: Set<ISODate>;
  highlight?: ISODate;
  centerLabel?: string;
  onPressDate?: (date: ISODate) => void;
}) {
  const c = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 4;
  const inner = R * 0.3;
  const step = (R - inner) / CYCLE_YEARS;
  const startMd = mdOf(start);
  const base = yearOf(start) + cycleIndex(start, today) * CYCLE_YEARS;

  const dateAt = (k: number, slot: number): ISODate | null => {
    const md = SLOT_MD[slot];
    return dateFor(base + k + (md < startMd ? 1 : 0), md);
  };

  const rings = useMemo(() => {
    return Array.from({ length: CYCLE_YEARS }, (_, k) => {
      const statuses: Status[] = SLOT_MD.map((_, s) => {
        const d = dateAt(k, s);
        if (!d || d > today || d < start) return 'future';
        // Feb 29 entries also light up the shared Feb 28 slot.
        const leap = SLOT_MD[s] === '02-28' ? dateFor(yearOf(d), '02-29') : null;
        return written.has(d) || (leap && written.has(leap)) ? 'filled' : 'empty';
      });
      const runs: { from: number; to: number; status: Status }[] = [];
      statuses.forEach((st, i) => {
        const last = runs[runs.length - 1];
        if (last && last.status === st) last.to = i;
        else runs.push({ from: i, to: i, status: st });
      });
      return runs;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [written, start, today, base, startMd]);

  const gap = (Math.PI * 2) / SLOTS * 0.18;
  const todayAngle = angleOf(ringSlot(mdOf(today)));

  const handlePress = (e: GestureResponderEvent) => {
    if (!onPressDate) return;
    const { locationX, locationY } = e.nativeEvent;
    const dx = locationX - cx;
    const dy = locationY - cy;
    const dist = Math.hypot(dx, dy);
    const k = Math.floor((dist - inner) / step);
    if (k < 0 || k >= CYCLE_YEARS) return;
    let a = Math.atan2(dy, dx) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    const slot = Math.min(SLOTS - 1, Math.floor((a / (Math.PI * 2)) * SLOTS));
    const d = dateAt(k, slot);
    if (d) onPressDate(d);
  };

  const hl =
    highlight && cycleIndex(start, highlight) === cycleIndex(start, today)
      ? (() => {
          const k = yearIndexInCycle(start, highlight);
          const a = angleOf(ringSlot(mdOf(highlight)) + 0.5);
          const r = inner + step * (k + 0.5);
          return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), color: c.years[k] };
        })()
      : null;

  return (
    <Pressable onPress={handlePress} disabled={!onPressDate} accessibilityLabel="다섯 해의 나이테. 눌러서 해당 날짜로 이동">
      <Svg width={size} height={size}>
        <G>
          {rings.map((runs, k) => {
            const r = inner + step * (k + 0.5);
            return runs.map((run) => {
              const a0 = angleOf(run.from) + gap;
              const a1 = angleOf(run.to + 1) - gap;
              const color = run.status === 'filled' ? c.years[k] : c.line;
              const opacity = run.status === 'future' ? 0.35 : run.status === 'empty' ? 0.9 : 1;
              if (run.from === 0 && run.to === SLOTS - 1) {
                return (
                  <Circle key={`${k}-all`} cx={cx} cy={cy} r={r} stroke={color} strokeOpacity={opacity} strokeWidth={step * 0.62} fill="none" />
                );
              }
              return (
                <Path
                  key={`${k}-${run.from}`}
                  d={arc(cx, cy, r, a0, a1)}
                  stroke={color}
                  strokeOpacity={opacity}
                  strokeWidth={step * 0.62}
                  fill="none"
                />
              );
            });
          })}
          <Line
            x1={cx + (inner - 6) * Math.cos(todayAngle)}
            y1={cy + (inner - 6) * Math.sin(todayAngle)}
            x2={cx + (R + 2) * Math.cos(todayAngle)}
            y2={cy + (R + 2) * Math.sin(todayAngle)}
            stroke={c.ink}
            strokeWidth={1.2}
            strokeDasharray="2,3"
          />
          {hl ? <Circle cx={hl.x} cy={hl.y} r={Math.max(4, step * 0.38)} fill={hl.color} stroke={c.surface} strokeWidth={2} /> : null}
          <SvgText
            x={cx}
            y={cy + size * 0.025}
            fontSize={size * 0.07}
            fontFamily={fonts.mono}
            fill={c.ink}
            textAnchor="middle">
            {centerLabel ?? `${mdOf(today).replace('-', '.')}`}
          </SvgText>
        </G>
      </Svg>
    </Pressable>
  );
}

