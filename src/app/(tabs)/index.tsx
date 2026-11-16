import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { PanResponder, Pressable, View } from 'react-native';

import { useApp, useDb, useNavDate } from '@/app-context';
import { YearCell } from '@/components/diary-bits';
import { Card, Chip, Screen, T } from '@/components/ui';
import { getEntriesBetween } from '@/lib/db';
import { addDays, diffDays, formatKo, mdOf, weekdayKo, yearOf, BACKFILL_DAYS, type ISODate } from '@/lib/dates';
import { pageCells, questionFor, relativeYears, type Cell } from '@/lib/diary';
import { space, useColors } from '@/theme';

export default function TodayScreen() {
  const { today, start, settings } = useApp();
  const c = useColors();
  const params = useLocalSearchParams<{ date?: string }>();
  const [navDate, setNavDate] = useNavDate(params.date);
  const date = navDate ?? today;

  const cells = useDb(() => pageCells(start, date, today), [start, date, today]);
  const missed = useDb(() => {
    const from = addDays(today, -BACKFILL_DAYS) < start ? start : addDays(today, -BACKFILL_DAYS);
    const to = addDays(today, -1);
    if (to < from) return 0;
    return diffDays(from, to) + 1 - getEntriesBetween(from, to).length;
  }, [start, today]);

  const go = useCallback(
    (n: number) => setNavDate((d) => addDays(d ?? today, n)),
    [setNavDate, today],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > 60) go(g.dx < 0 ? 1 : -1);
        },
      }),
    [go],
  );

  const md = mdOf(date);
  const question = questionFor(md, settings.questionMode);
  const ordered = [
    ...cells.filter((x) => x.state !== 'future').sort((a, b) => b.year - a.year),
    ...cells.filter((x) => x.state === 'future').sort((a, b) => a.year - b.year),
  ];
  const todayYear = yearOf(today);

  return (
    <Screen>
      <View {...pan.panHandlers} style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Pressable
            onLongPress={() => setNavDate(null)}
            accessibilityHint="길게 누르면 오늘로 돌아가요">
            <T kind="small">
              {yearOf(date)} · {weekdayKo(date)}요일{date === today ? ' · 오늘' : ''}
            </T>
            <T kind="display">{formatKo(date)}</T>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {date !== today ? (
              <Chip
                label="오늘로"
                onPress={() => setNavDate(null)}
              />
            ) : null}
            <NavBtn label="‹" a11y="어제" onPress={() => go(-1)} />
            <NavBtn label="›" a11y="내일" onPress={() => go(1)} />
          </View>
        </View>

        <T kind="question">{question}</T>

        {ordered.map((cell) => (
          <CellView key={cell.k} cell={cell} color={c.years[cell.k]} todayYear={todayYear} today={today} />
        ))}

        {date === today && missed > 0 ? (
          <Pressable onPress={() => router.push('/calendar')}>
            <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T kind="small" style={{ flex: 1 }}>
                지난 {BACKFILL_DAYS}일 중 {missed}일이 비어 있어요. 지금 채울 수 있어요.
              </T>
              <T color={c.accent} style={{ fontWeight: '600' }}>달력 ›</T>
            </Card>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

function NavBtn({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityLabel={a11y} hitSlop={6} style={{ paddingHorizontal: 10, paddingVertical: 4 }}>
      <T style={{ fontSize: 24, color: c.ink3 }}>{label}</T>
    </Pressable>
  );
}

function CellView({ cell, color, todayYear, today }: { cell: Cell; color: string; todayYear: number; today: ISODate }) {
  const c = useColors();
  const { entry, state, date, year } = cell;
  const meta = date ? `${relativeYears(year, todayYear)} · ${weekdayKo(date)}` : undefined;

  if (entry && date) {
    return (
      <YearCell
        color={color}
        year={year}
        meta={(entry.late ? '나중에 씀 · ' : '') + (state === 'today' ? '오늘' : meta)}
        variant={state === 'today' ? 'now' : 'past'}
        onPress={() => router.push({ pathname: '/entry', params: { date } })}>
        {entry.kind === 'memo' ? (
          <T kind="small" numberOfLines={2}>기억 메모 · {entry.text}</T>
        ) : (
          <T numberOfLines={2}>{entry.text || '(사진과 태그만 남긴 날)'}</T>
        )}
        {entry.tags.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {entry.tags.slice(0, 4).map((t) => (
              <Chip key={t} label={`#${t}`} color={color} />
            ))}
          </View>
        ) : null}
      </YearCell>
    );
  }

  switch (state) {
    case 'today':
      return (
        <YearCell color={color} year={year} meta="오늘" variant="now" onPress={() => router.push({ pathname: '/write', params: { date: date! } })}>
          <T color={c.ink3}>눌러서 오늘의 칸 채우기</T>
        </YearCell>
      );
    case 'backfill':
      return (
        <YearCell color={color} year={year} meta={meta} variant="blank" onPress={() => router.push({ pathname: '/write', params: { date: date! } })}>
          <T kind="small">비어 있어요 · 지금 채울 수 있어요</T>
        </YearCell>
      );
    case 'past':
      return (
        <YearCell
          color={color}
          year={year}
          meta={meta}
          variant="blank"
          onPress={() => router.push({ pathname: '/write', params: { date: date!, memo: '1' } })}>
          <T kind="small">이 날은 비어 있어요 · 기억 메모 남기기</T>
        </YearCell>
      );
    case 'future':
      return (
        <YearCell color={color} year={year} meta={date ? `${diffDays(today, date)}일 후` : undefined} variant="future">
          <T kind="small">아직 오지 않은 해</T>
        </YearCell>
      );
    case 'before-start':
      return (
        <YearCell color={color} year={year} meta={meta} variant="blank">
          <T kind="small">다이어리를 시작하기 전이에요</T>
        </YearCell>
      );
    default:
      return (
        <YearCell color={color} year={year} variant="blank">
          <T kind="small">이 해에는 2월 29일이 없어요</T>
        </YearCell>
      );
  }
}
