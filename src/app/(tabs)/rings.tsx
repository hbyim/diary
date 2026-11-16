import { router } from 'expo-router';
import { View } from 'react-native';

import { useApp, useDb } from '@/app-context';
import { RingChart } from '@/components/ring-chart';
import { Button, Card, Chip, Screen, T } from '@/components/ui';
import { getAllEntries, type Entry } from '@/lib/db';
import { addDays, CYCLE_YEARS, cycleIndex, cycleRange, currentDiaryYear, diffDays, mdOf, monthOf, yearIndexInCycle } from '@/lib/dates';
import { MAX_WIDTH, useLayout } from '@/hooks/use-layout';
import { fonts, space, useColors } from '@/theme';

export default function RingsScreen() {
  const { start, today } = useApp();
  const c = useColors();
  const { width, height, isWide, isLandscape, columnGap } = useLayout();
  const entries = useDb(getAllEntries, []);

  const cycle = cycleIndex(start, today);
  const range = cycleRange(start, cycle);
  const inCycle = entries.filter((e) => e.date >= range.from && e.date <= range.to);
  const written = new Set(inCycle.map((e) => e.date));
  const total = diffDays(range.from, range.to) + 1;
  const elapsed = diffDays(range.from, today) + 1;
  const perYear = Array.from({ length: CYCLE_YEARS }, (_, k) => inCycle.filter((e) => yearIndexInCycle(start, e.date) === k).length);

  // A page is "full" when every one of its five cells has something written.
  const byMd = new Map<string, number>();
  for (const e of inCycle) byMd.set(mdOf(e.date), (byMd.get(mdOf(e.date)) ?? 0) + 1);
  const fullPages = [...byMd.values()].filter((n) => n >= CYCLE_YEARS).length;

  // Months that are most often empty and most consistent so far.
  const monthStats = Array.from({ length: 12 }, (_, m) => {
    let days = 0;
    let hits = 0;
    for (let d = range.from; d <= today && d <= range.to; d = addDays(d, 1)) {
      if (monthOf(d) !== m + 1) continue;
      days++;
      if (written.has(d)) hits++;
    }
    return { m: m + 1, rate: days ? hits / days : -1 };
  }).filter((x) => x.rate >= 0);
  const sorted = [...monthStats].sort((a, b) => a.rate - b.rate);

  const year = currentDiaryYear(start, today);
  const thisYear = inCycle.filter((e) => e.date >= year.from && e.date <= today);
  const tagCounts = new Map<string, number>();
  for (const e of thisYear) for (const t of e.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const longest = thisYear.reduce<Entry | null>((a, e) => (!a || e.text.length > a.text.length ? e : a), null);

  // Side by side only when there is room for a decent ring next to the stats
  // (desktop, landscape); portrait tablets stack a large ring above them instead.
  const twoColumn = isWide && (width >= 1000 || isLandscape);
  const size = twoColumn
    ? Math.max(220, Math.min((Math.min(width, MAX_WIDTH.wide) - 64) / 2, height - 160, 520))
    : Math.min(width - 32, isWide ? 520 : 380);

  const titleRow = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <T kind="title">나의 나이테</T>
      <T kind="small">{cycle > 0 ? `${cycle + 1}번째 다섯 해 · ` : ''}{year.index + 1}년째</T>
    </View>
  );

  const ring = (
    <View style={{ alignItems: 'center', gap: space.sm }}>
      <RingChart
        size={size}
        start={start}
        today={today}
        written={written}
        onPressDate={(d) => router.navigate({ pathname: '/', params: { date: d } })}
      />
      <T kind="small" style={{ textAlign: 'center' }}>안쪽이 첫해, 바깥이 다섯째 해예요. 원을 누르면 그 날짜로 이동해요.</T>
    </View>
  );

  const stats = (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {perYear.map((n, k) => (
          <View key={k} style={{ alignItems: 'center' }}>
            <T kind="mono" color={c.years[k]} style={{ fontWeight: '600' }}>{k + 1}년째</T>
            <T kind="small">{n}일</T>
          </View>
        ))}
      </View>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T>기록한 날</T>
          <T kind="mono" style={{ color: c.ink, fontSize: 15 }}>
            {written.size.toLocaleString()} / {total.toLocaleString()}
          </T>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: c.surface2, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${(written.size / total) * 100}%`, backgroundColor: c.accent }} />
        </View>
        <T kind="small">
          지금까지 {elapsed.toLocaleString()}일 중 {written.size.toLocaleString()}일 · 다섯 칸이 다 찬 날 {fullPages}일
        </T>
        {sorted.length >= 2 ? (
          <T kind="small">
            가장 많이 비는 달: {sorted[0].m}월 · 가장 꾸준한 달: {sorted[sorted.length - 1].m}월
          </T>
        ) : null}
      </Card>

      <Card>
        <T kind="label">{year.index + 1}년째 돌아보기</T>
        <T>
          {thisYear.length}일을 기록했어요{topTags.length ? ` · 가장 많이 한 일 ` : ''}
          {topTags.map(([t]) => `#${t}`).join(' ')}
        </T>
        {longest && longest.text ? (
          <T kind="small" numberOfLines={2}>
            가장 길게 쓴 날 {longest.date.replaceAll('-', '.')}: {longest.text}
          </T>
        ) : null}
      </Card>

      <Button title="달력으로 보기" variant="ghost" onPress={() => router.push('/calendar')} />
      {cycle > 0 ? <Chip label={`이전 다섯 해의 기록 ${entries.length - inCycle.length}일은 보관돼 있어요`} selected={false} /> : null}
      <T kind="small" style={{ fontFamily: fonts.mono, textAlign: 'center' }}>
        {range.from.replaceAll('-', '.')} — {range.to.replaceAll('-', '.')}
      </T>
    </>
  );

  if (twoColumn) {
    return (
      <Screen maxWidth={MAX_WIDTH.wide}>
        {titleRow}
        <View style={{ flexDirection: 'row', gap: columnGap, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>{ring}</View>
          <View style={{ flex: 1, gap: space.md, minWidth: 0 }}>{stats}</View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {titleRow}
      {ring}
      {stats}
    </Screen>
  );
}

