import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, View, useWindowDimensions } from 'react-native';

import { useApp } from '@/app-context';
import { RingChart } from '@/components/ring-chart';
import { Button, Card, Chip, Screen, T } from '@/components/ui';
import { overlapWords } from '@/lib/analysis';
import { countEntriesBetween, getEntry, getWrittenDates } from '@/lib/db';
import { currentDiaryYear, formatKo, yearIndexInCycle } from '@/lib/dates';
import { pageCells } from '@/lib/diary';
import { MAX_WIDTH } from '@/hooks/use-layout';
import { space, useColors } from '@/theme';

const ORDINAL = ['첫', '두', '세', '네', '다섯'];

export default function SavedScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { start, today } = useApp();
  const c = useColors();
  const { width, height } = useWindowDimensions();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) anim.setValue(1);
      else Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    });
  }, [anim]);

  const data = useMemo(() => {
    const entry = getEntry(date);
    const cells = pageCells(start, date, today);
    const past = cells.filter((x) => x.entry && x.date !== date && x.entry.kind === 'entry');
    const layers = cells.filter((x) => x.entry).length;
    const year = currentDiaryYear(start, date);
    const written = countEntriesBetween(year.from, date);
    const elapsed = Math.min(year.elapsed, currentDiaryYear(start, today).elapsed);
    return {
      words: entry ? overlapWords(entry.text, past.map((x) => x.entry!.text)) : [],
      pastColors: past.map((x) => c.years[x.k]),
      layers,
      written,
      elapsed,
      dates: new Set(getWrittenDates().map((d) => d.date)),
    };
  }, [date, start, today, c.years]);

  const k = yearIndexInCycle(start, date);
  const size = Math.min(width - 96, height * 0.42, 340);
  const message =
    data.layers === 2
      ? `처음으로 ${formatKo(date)}에\n두 겹이 생겼어요`
      : `${ORDINAL[k]} 번째 나이테에\n${formatKo(date)}이 새겨졌어요`;

  return (
    <Screen edges={['top', 'bottom']} maxWidth={MAX_WIDTH.narrow} contentStyle={{ alignItems: 'stretch', paddingTop: space.xl }}>
      <Animated.View
        style={{
          alignSelf: 'center',
          opacity: anim,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}>
        <RingChart size={size} start={start} today={today} written={data.dates} highlight={date} />
      </Animated.View>
      <T kind="title" style={{ textAlign: 'center', lineHeight: 30 }}>
        {message}
      </T>
      <T kind="small" style={{ textAlign: 'center' }}>
        올해 {data.elapsed}일 중 {data.written}일을 기록했어요
      </T>
      {data.words.length ? (
        <Card>
          <T kind="small">지난 해들과 겹친 말</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {data.words.map((w, i) => (
              <Chip key={w} label={w} color={data.pastColors[i % data.pastColors.length] ?? c.accent} />
            ))}
          </View>
        </Card>
      ) : null}
      <View style={{ gap: space.sm, marginTop: space.md }}>
        {data.layers > 1 ? (
          <Button
            title="지난 해의 답과 나란히 보기"
            variant="ghost"
            onPress={() => router.replace({ pathname: '/discover', params: { date } })}
          />
        ) : null}
        <Button title="닫기" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
