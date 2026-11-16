import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { useApp, useDb, useNavDate } from '@/app-context';
import { MoodChart } from '@/components/diary-bits';
import { Card, Chip, Columns, Screen, T } from '@/components/ui';
import { consecutiveRun, firstLine, repeatedTags } from '@/lib/analysis';
import { getEntriesBetween } from '@/lib/db';
import { addDays, addYears, formatKo, mdOf, yearIndexInCycle } from '@/lib/dates';
import { pageCells } from '@/lib/diary';
import { MAX_WIDTH, useLayout } from '@/hooks/use-layout';
import { space, useColors } from '@/theme';

export default function DiscoverScreen() {
  const { start, today } = useApp();
  const c = useColors();
  const { width, isWide, columnGap } = useLayout();
  // Wide screens lay the cards out in two columns.
  const pageWidth = Math.min(width, isWide ? MAX_WIDTH.wide : MAX_WIDTH.reading) - 2 * space.lg;
  const colWidth = isWide ? (pageWidth - columnGap) / 2 : pageWidth;
  const params = useLocalSearchParams<{ date?: string }>();
  const [navDate, setNavDate] = useNavDate(params.date);
  const date = navDate ?? today;
  const cells = useDb(() => pageCells(start, date, today), [start, date, today]);
  const lastYearWeek = useDb(() => {
    const ref = addYears(today, -1);
    return getEntriesBetween(addDays(ref, -3), addDays(ref, 3));
  }, [today]);

  const filled = cells.filter((x) => x.entry && x.entry.kind === 'entry');
  const repeats = repeatedTags(filled.map((x) => ({ year: x.year, tags: x.entry!.tags })));
  const moods = filled.filter((x) => x.entry!.mood).map((x) => ({ year: x.year, mood: x.entry!.mood!, color: c.years[x.k] }));

  return (
    <Screen maxWidth={isWide ? MAX_WIDTH.wide : MAX_WIDTH.reading}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <T kind="small">같은 날 비교</T>
          <T kind="title">{formatKo(date)}의 나</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {date !== today ? <Chip label="오늘" onPress={() => setNavDate(null)} /> : null}
          <Pressable onPress={() => setNavDate((d) => addDays(d ?? today, -1))} hitSlop={8} accessibilityLabel="전날" style={{ paddingHorizontal: 10 }}>
            <T style={{ fontSize: 22, color: c.ink3 }}>‹</T>
          </Pressable>
          <Pressable onPress={() => setNavDate((d) => addDays(d ?? today, 1))} hitSlop={8} accessibilityLabel="다음날" style={{ paddingHorizontal: 10 }}>
            <T style={{ fontSize: 22, color: c.ink3 }}>›</T>
          </Pressable>
        </View>
      </View>

      <Columns two={isWide} gap={isWide ? columnGap : space.md}>
        {filled.length < 2 ? (
          <Card>
            <T kind="question">두 해 이상 쓴 날부터 열려요</T>
            <T kind="small">
              {formatKo(date)}에는 지금 {filled.length}개의 기록이 있어요. 내년 이 날 한 번 더 쓰면 해마다 반복되는 일과 달라진 답을 나란히 보여드려요.
            </T>
          </Card>
        ) : (
          <>
            <Card>
              <T kind="label">반복된 일</T>
              {repeats.length ? (
                repeats.map((r) => {
                  const run = consecutiveRun(r.years);
                  return (
                    <View key={r.tag} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <T style={{ fontWeight: '600' }}>#{r.tag}</T>
                      <T kind="small">{r.years.join(', ')}</T>
                      {run >= 2 ? <Chip label={`${run}년 연속`} /> : null}
                    </View>
                  );
                })
              ) : (
                <T kind="small">아직 같은 태그가 반복된 적은 없어요.</T>
              )}
            </Card>

            {moods.length ? (
              <Card>
                <T kind="label">이날의 기분</T>
                <MoodChart points={moods} width={colWidth - 2 * space.md} />
              </Card>
            ) : null}

            <Card>
              <T kind="label">같은 질문, 달라진 답</T>
              {filled.map((x) => (
                <Pressable
                  key={x.k}
                  onPress={() => router.push({ pathname: '/entry', params: { date: x.date! } })}
                  style={{ flexDirection: 'row', gap: space.sm }}>
                  <T kind="mono" color={c.years[x.k]} style={{ fontWeight: '600', width: 40 }}>{x.year}</T>
                  <T style={{ flex: 1 }} numberOfLines={2}>{firstLine(x.entry!.text, 60) || '(태그·사진만)'}</T>
                </Pressable>
              ))}
            </Card>
          </>
        )}

        <Card>
          <T kind="label">1년 전 이번 주</T>
          {lastYearWeek.length ? (
            lastYearWeek.map((e) => (
              <Pressable key={e.date} onPress={() => router.push({ pathname: '/entry', params: { date: e.date } })} style={{ flexDirection: 'row', gap: space.sm }}>
                <T kind="mono" color={c.years[yearIndexInCycle(start, e.date)]} style={{ width: 48 }}>
                  {mdOf(e.date).replace('-', '.')}
                </T>
                <T style={{ flex: 1 }} numberOfLines={1}>
                  {e.tags.length ? e.tags.map((t) => `#${t}`).join(' ') + ' · ' : ''}
                  {firstLine(e.text, 40)}
                </T>
              </Pressable>
            ))
          ) : (
            <T kind="small">1년 전 이맘때의 기록이 아직 없어요.</T>
          )}
        </Card>

        <Pressable onPress={() => router.push('/anniversaries')}>
          <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <T>나의 연례 행사</T>
              <T kind="small">기념일·첫눈처럼 해마다 돌아오는 날을 알려드려요</T>
            </View>
            <T color={c.ink3}>›</T>
          </Card>
        </Pressable>
      </Columns>
    </Screen>
  );
}
