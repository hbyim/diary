import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApp, useDb } from '@/app-context';
import { Chip, Screen, T } from '@/components/ui';
import { getWrittenDates } from '@/lib/db';
import { BACKFILL_DAYS, cellState, dayOf, monthMatrix, monthOf, yearIndexInCycle, yearOf, type ISODate } from '@/lib/dates';
import { MAX_WIDTH } from '@/hooks/use-layout';
import { fonts, space, useColors } from '@/theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarScreen() {
  const { today, start } = useApp();
  const c = useColors();
  const [ym, setYm] = useState({ y: yearOf(today), m: monthOf(today) });
  const written = useDb(() => new Map(getWrittenDates().map((d) => [d.date, { kind: d.kind, late: d.late }])), []);

  const shift = (n: number) =>
    setYm(({ y, m }) => {
      const t = m - 1 + n;
      return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 + 1 };
    });

  const cells = monthMatrix(ym.y, ym.m);
  const open = (d: ISODate) => {
    const w = written.get(d);
    const st = cellState(d, today, start);
    if (w) router.push({ pathname: '/entry', params: { date: d } });
    else if (st === 'today' || st === 'backfill') router.push({ pathname: '/write', params: { date: d } });
    else if (st === 'past') router.push({ pathname: '/write', params: { date: d, memo: '1' } });
  };

  return (
    <Screen edges={[]} maxWidth={MAX_WIDTH.narrow}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <T kind="title">
          {ym.y}년 {ym.m}월
        </T>
        <View style={{ flexDirection: 'row' }}>
          <Pressable onPress={() => shift(-1)} hitSlop={8} style={{ paddingHorizontal: 12 }} accessibilityLabel="이전 달">
            <T style={{ fontSize: 22, color: c.ink3 }}>‹</T>
          </Pressable>
          <Pressable onPress={() => shift(1)} hitSlop={8} style={{ paddingHorizontal: 12 }} accessibilityLabel="다음 달">
            <T style={{ fontSize: 22, color: c.ink3 }}>›</T>
          </Pressable>
        </View>
      </View>
      <View style={styles.grid}>
        {WEEK.map((w) => (
          <View key={w} style={styles.cell}>
            <T kind="small">{w}</T>
          </View>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const w = written.get(d);
          const st = cellState(d, today, start);
          const color = c.years[yearIndexInCycle(start, d)];
          const inactive = st === 'future' || st === 'before-start';
          const bg = d === today ? color : w ? color + (w.kind === 'memo' ? '18' : '33') : 'transparent';
          return (
            <Pressable
              key={d}
              onPress={() => open(d)}
              disabled={inactive}
              accessibilityLabel={`${ym.m}월 ${dayOf(d)}일 ${w ? '기록 있음' : '비어 있음'}`}
              style={styles.cell}>
              <View
                style={[
                  styles.day,
                  {
                    backgroundColor: bg,
                    borderColor: w?.late ? c.years[0] : !w && !inactive ? c.line : 'transparent',
                    borderStyle: !w && !inactive ? 'dashed' : 'solid',
                    borderWidth: w?.late || (!w && !inactive) ? 1.5 : 0,
                  },
                ]}>
                <T
                  style={{ fontFamily: fonts.mono, fontSize: 13 }}
                  color={d === today ? c.accentInk : inactive ? c.ink3 : c.ink}>
                  {dayOf(d)}
                </T>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip label="■ 기록" />
        <Chip label="▢ 빈 날" selected={false} />
        <Chip label="▣ 나중에 쓴 날" color={c.years[0]} />
      </View>
      <T kind="small">
        최근 {BACKFILL_DAYS}일 안의 빈 날은 지금 채울 수 있고, ‘나중에 씀’ 표시가 붙어요. 그보다 오래된 날에는 한 줄 기억 메모만 남길 수 있어요.
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 3, alignItems: 'center', justifyContent: 'center' },
  day: { width: '100%', height: '100%', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
