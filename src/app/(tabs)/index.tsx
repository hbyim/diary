import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useApp, useDb, useNavDate } from '@/app-context';
import { Button, Card, Chip, Screen, T } from '@/components/ui';
import { WeatherBadge, WeatherIcon, WeatherPicker } from '@/components/weather';
import { MAX_WIDTH, useLayout } from '@/hooks/use-layout';
import { firstLine } from '@/lib/analysis';
import { getEntry, getWrittenDates, saveEntry, type WrittenDate } from '@/lib/db';
import {
  cellState,
  dayOf,
  formatKo,
  isLocked,
  mdOf,
  monthMatrix,
  monthOf,
  weekdayKo,
  yearIndexInCycle,
  yearOf,
  type ISODate,
} from '@/lib/dates';
import { pageCells, questionFor, relativeYears } from '@/lib/diary';
import type { Weather } from '@/lib/weather';
import { fonts, radius, space, useColors } from '@/theme';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * First tab: a month calendar on top and, below it, the selected day:
 * today's quick entry (question, weather, answer) or a past day's record,
 * with the same date in the other years. Side by side on wide screens.
 */
export default function CalendarTab() {
  const { today } = useApp();
  const { isWide, columnGap } = useLayout();
  const params = useLocalSearchParams<{ date?: string }>();
  const [navDate, setNavDate] = useNavDate(params.date);
  const selected = navDate ?? today;

  // The month on screen follows the selected date, but the arrows can page away from it.
  const [view, setView] = useState({ y: yearOf(selected), m: monthOf(selected), anchor: selected });
  if (view.anchor !== selected) setView({ y: yearOf(selected), m: monthOf(selected), anchor: selected });

  const written = useDb(() => new Map(getWrittenDates().map((d) => [d.date, d])), []);

  const shiftMonth = (n: number) =>
    setView((v) => {
      const t = v.m - 1 + n;
      return { ...v, y: v.y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 + 1 };
    });

  const calendar = (
    <MonthCalendar
      year={view.y}
      month={view.m}
      selected={selected}
      written={written}
      tall={isWide}
      onSelect={(d) => setNavDate(d === today ? null : d)}
      onShift={shiftMonth}
      onToday={() => {
        setNavDate(null);
        setView({ y: yearOf(today), m: monthOf(today), anchor: today });
      }}
      showToday={selected !== today || view.y !== yearOf(today) || view.m !== monthOf(today)}
    />
  );

  if (isWide) {
    return (
      <Screen maxWidth={MAX_WIDTH.wide}>
        <View style={{ flexDirection: 'row', gap: columnGap, alignItems: 'flex-start' }}>
          <View style={{ flex: 1, minWidth: 0 }}>{calendar}</View>
          <View style={{ width: 420 }}>
            <DayPanel key={selected} date={selected} />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {calendar}
      <DayPanel key={selected} date={selected} />
    </Screen>
  );
}

function MonthCalendar({
  year,
  month,
  selected,
  written,
  tall,
  onSelect,
  onShift,
  onToday,
  showToday,
}: {
  year: number;
  month: number;
  selected: ISODate;
  written: Map<ISODate, WrittenDate>;
  tall: boolean;
  onSelect: (d: ISODate) => void;
  onShift: (n: number) => void;
  onToday: () => void;
  showToday: boolean;
}) {
  const c = useColors();
  const { today, start } = useApp();
  const cells = monthMatrix(year, month);
  const h = tall ? 84 : 46;

  return (
    <View style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T kind="display" style={{ fontSize: tall ? 28 : 24 }}>
          {year}년 {month}월
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          {showToday ? <Chip label="오늘로" onPress={onToday} /> : null}
          <NavBtn label="‹" a11y="이전 달" onPress={() => onShift(-1)} />
          <NavBtn label="›" a11y="다음 달" onPress={() => onShift(1)} />
        </View>
      </View>
      <View style={styles.week}>
        {WEEK.map((w, i) => (
          <Text key={w} style={[styles.weekLabel, { color: i === 0 ? c.danger : c.ink3 }]}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={[styles.cell, { height: h }]} />;
          const w = written.get(d);
          const st = cellState(d, today, start);
          const isSel = d === selected;
          const inactive = st === 'future' || st === 'before-start';
          const bg = isSel ? c.accent : w ? c.accent + (w.kind === 'memo' ? '10' : '1F') : 'transparent';
          const borderColor = isSel ? c.accent : d === today ? c.accent : !w && !inactive ? c.line : 'transparent';
          const dashed = !w && !inactive && d !== today && !isSel;
          const num = isSel ? c.accentInk : inactive ? c.ink3 : d === today ? c.accent : c.ink;
          const label = `${month}월 ${dayOf(d)}일${d === today ? ', 오늘' : ''}${w ? ', 기록 있음' : inactive ? '' : ', 비어 있음'}`;
          return (
            <View key={d} style={[styles.cell, { height: h }]}>
              <Pressable
                onPress={() => onSelect(d)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={label}
                style={({ pressed }) => [
                  styles.day,
                  tall ? styles.dayTall : null,
                  {
                    backgroundColor: bg,
                    borderColor,
                    borderWidth: borderColor === 'transparent' ? 0 : d === today && !isSel ? 2 : 1.5,
                    borderStyle: dashed ? 'dashed' : 'solid',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Text style={{ fontFamily: fonts.mono, fontSize: tall ? 14 : 13, color: num, fontWeight: d === today ? '600' : '400' }}>
                  {dayOf(d)}
                </Text>
                {w?.weather ? (
                  <WeatherIcon kind={w.weather} size={tall ? 20 : 13} color={isSel ? c.accentInk : c.accent} />
                ) : d === today && !isSel && !w ? (
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.accent }} />
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function NavBtn({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={6} style={styles.navBtn}>
      <Text style={{ fontSize: 24, color: c.ink3 }}>{label}</Text>
    </Pressable>
  );
}

/** The selected day: today's quick entry, a written day's record, or what can be done with an empty one. */
function DayPanel({ date }: { date: ISODate }) {
  const c = useColors();
  const { today, start, settings } = useApp();
  const cells = useDb(() => pageCells(start, date, today), [start, date, today]);
  const here = cells.find((x) => x.date === date) ?? null;
  const entry = here?.entry ?? null;
  const others = cells.filter((x) => x.date !== date && x.entry);
  const state = cellState(date, today, start);
  const writable = state === 'today' || state === 'backfill';
  // Days that can still be written show the input form, written or not (an entry stays
  // editable for 7 days). Decided when the panel opens (it is keyed by date), so the form
  // stays put after its first autosave creates the entry.
  const [quick] = useState(writable && (!entry || (entry.kind === 'entry' && !isLocked(entry.writtenAt))));

  const color = c.years[yearIndexInCycle(start, date)];

  return (
    <Card style={[styles.panel, { backgroundColor: c.surface }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
        <T kind="small" style={{ flexShrink: 1 }}>
          {yearOf(date)} · {formatKo(date)} {weekdayKo(date)}요일
          {date === today ? <Text style={{ color: c.accent, fontWeight: '600' }}> · 오늘</Text> : null}
        </T>
        {entry && !quick ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {entry.weather ? <WeatherBadge kind={entry.weather} /> : null}
            {entry.late ? <Chip label="나중에 씀" color={c.years[0]} /> : null}
          </View>
        ) : null}
      </View>

      {quick ? (
        <QuickEntry date={date} />
      ) : entry ? (
        <View style={{ gap: space.sm }}>
          {entry.kind === 'entry' && entry.question ? <T kind="question" color={c.ink2}>{entry.question}</T> : null}
          {entry.kind === 'memo' ? <Chip label="기억 메모" color={c.years[0]} /> : null}
          <T numberOfLines={6}>{entry.text || '(날씨·태그·사진만 남긴 날)'}</T>
          {entry.tags.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {entry.tags.map((t) => (
                <Chip key={t} label={`#${t}`} color={color} />
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button title="자세히 보기" variant="ghost" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/entry', params: { date } })} />
            {!isLocked(entry.writtenAt) ? (
              <Button title="고치기" variant="ghost" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/write', params: { date } })} />
            ) : null}
          </View>
        </View>
      ) : state === 'past' ? (
        <View style={{ gap: space.sm }}>
          <T kind="question" color={c.ink2}>{questionFor(mdOf(date), settings.questionMode)}</T>
          <T kind="small">이 날은 비어 있어요. 오래된 날에는 그날이 기억나는 대로 한 줄 메모만 남길 수 있어요.</T>
          <Button title="기억 메모 남기기" variant="ghost" onPress={() => router.push({ pathname: '/write', params: { date, memo: '1' } })} />
        </View>
      ) : (
        <T kind="small">{state === 'future' ? '아직 오지 않은 날이에요.' : '다이어리를 시작하기 전이에요.'}</T>
      )}

      {quick || entry || others.length ? (
        <View style={{ gap: space.sm, marginTop: space.xs }}>
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line }} />
          <T kind="label">같은 날, 다른 해</T>
          {others.length ? (
            others.map((x) => (
              <Pressable
                key={x.k}
                onPress={() => router.push({ pathname: '/entry', params: { date: x.date! } })}
                accessibilityRole="button"
                accessibilityLabel={`${x.year}년 ${formatKo(date)} 기록 보기`}
                style={({ pressed }) => [styles.otherRow, { opacity: pressed ? 0.6 : 1 }]}>
                <T kind="mono" color={c.years[x.k]} style={{ width: 44, fontWeight: '600' }}>
                  {x.year}
                </T>
                <View style={{ width: 20, alignItems: 'center' }}>
                  {x.entry!.weather ? <WeatherIcon kind={x.entry!.weather} size={17} color={c.ink2} /> : null}
                </View>
                <T style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
                  {firstLine(x.entry!.text, 60) || '(날씨·태그만)'}
                </T>
                <T kind="small">{relativeYears(x.year, yearOf(today))}</T>
              </Pressable>
            ))
          ) : (
            <T kind="small">다른 해의 이 날은 아직 비어 있어요. 내년 이 날이 오면 여기에 한 줄씩 쌓여요.</T>
          )}
        </View>
      ) : null}
    </Card>
  );
}

/** Today's (or a recent missed day's) question, weather and answer, saved as you go. */
function QuickEntry({ date }: { date: ISODate }) {
  const c = useColors();
  const { today, settings, bump } = useApp();
  const md = mdOf(date);
  const existing = useDb(() => getEntry(date), [date]);
  const [text, setText] = useState(existing?.text ?? '');
  const [weather, setWeather] = useState<Weather | null>(existing?.weather ?? null);
  const [saved, setSaved] = useState(false);
  const dirty = useRef(false);
  const question = existing?.question || questionFor(md, settings.questionMode);

  const persist = () => {
    if (!dirty.current) return;
    // Keep whatever the full write screen added (tags, mood, photo).
    const latest = existing;
    const hasContent = text.trim().length > 0 || weather !== null || (latest?.tags.length ?? 0) > 0;
    if (!hasContent) return;
    try {
      saveEntry({
        date,
        kind: 'entry',
        question,
        text,
        weather,
        mood: latest?.mood ?? null,
        tags: latest?.tags ?? [],
        photo: latest?.photo ?? null,
        late: date < today,
      });
      dirty.current = false;
      setSaved(true);
      bump();
    } catch {
      setSaved(false);
    }
  };

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(persist, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, weather]);

  return (
    <View style={{ gap: space.md }}>
      <T kind="question" style={{ fontSize: 18, lineHeight: 26 }}>{question}</T>
      <View style={{ gap: space.sm }}>
        <T kind="label">{date === today ? '오늘 날씨' : '그날 날씨'}</T>
        <WeatherPicker
          value={weather}
          onChange={(w) => {
            dirty.current = true;
            setWeather(w);
          }}
        />
      </View>
      <TextInput
        value={text}
        onChangeText={(v) => {
          dirty.current = true;
          setText(v);
        }}
        multiline
        placeholder={date === today ? '오늘의 답을 적어보세요' : '그날의 답을 적어보세요 · 나중에 씀 표시가 붙어요'}
        placeholderTextColor={c.ink3}
        textAlignVertical="top"
        accessibilityLabel="답"
        style={[styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.bg }]}
      />
      <T kind="small">{saved ? '자동 저장됨' : '쓰는 대로 저장돼요'}</T>
      <Button
        title="이어서 쓰기 · 한 일, 기분, 사진"
        onPress={() => {
          persist();
          router.push({ pathname: '/write', params: { date } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, padding: 2 },
  day: { flex: 1, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 1 },
  dayTall: { alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  panel: { padding: space.lg, gap: space.md, borderRadius: 20, marginTop: space.sm },
  otherRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 },
  input: { minHeight: 96, borderWidth: 1, borderRadius: radius.md, padding: space.md, fontSize: 15, lineHeight: 23 },
});
