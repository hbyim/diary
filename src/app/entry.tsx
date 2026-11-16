import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useApp, useDb } from '@/app-context';
import { MOOD_LABELS } from '@/components/diary-bits';
import { Button, Card, Chip, Screen, T } from '@/components/ui';
import { addAnniversary, addReply, deleteReply, getEntry, getReplies } from '@/lib/db';
import { EDIT_WINDOW_DAYS, formatKo, isLocked, mdOf, weekdayKo, yearIndexInCycle, yearOf } from '@/lib/dates';
import { pageCells, relativeYears } from '@/lib/diary';
import { rescheduleAll } from '@/lib/notifications';
import { radius, space, useColors } from '@/theme';

export default function EntryScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { start, today, bump } = useApp();
  const c = useColors();
  const entry = useDb(() => getEntry(date), [date]);
  const replies = useDb(() => getReplies(date), [date]);
  const [draft, setDraft] = useState('');
  const [annTitle, setAnnTitle] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);


  const k = yearIndexInCycle(start, date);
  const color = c.years[k];
  const todayYear = yearOf(today);
  const siblings = pageCells(start, date, today).filter((x) => x.entry);
  const idx = siblings.findIndex((x) => x.date === date);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  if (!entry) {
    return (
      <Screen edges={[]}>
        <T>기록이 없어요.</T>
      </Screen>
    );
  }

  const locked = isLocked(entry.writtenAt);
  const canReply = yearOf(date) < todayYear;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: `${yearOf(date)} · ${relativeYears(yearOf(date), todayYear)}` }} />
      <View style={{ gap: 2 }}>
        <T kind="small">
          {yearOf(date)} · {weekdayKo(date)}요일{entry.late ? ' · 나중에 씀' : ''}
        </T>
        <T kind="display" color={color}>{formatKo(date)}</T>
      </View>
      {entry.question && entry.kind === 'entry' ? <T kind="question" color={c.ink2}>{entry.question}</T> : null}
      {entry.photo ? <Image source={{ uri: entry.photo }} style={styles.photo} contentFit="cover" accessibilityLabel={`${date}의 사진`} /> : null}
      {entry.kind === 'memo' ? <Chip label="기억 메모 · 나중에 떠올려 쓴 기록" color={c.years[0]} /> : null}
      <T style={{ fontSize: 16, lineHeight: 27 }}>{entry.text}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        {entry.tags.map((t) => (
          <Chip key={t} label={`#${t}`} color={color} />
        ))}
        {entry.mood ? <T kind="small"> 기분 {entry.mood} · {MOOD_LABELS[entry.mood - 1]}</T> : null}
      </View>

      {!locked ? (
        <Button title="고치기" variant="ghost" onPress={() => router.push({ pathname: '/write', params: { date } })} />
      ) : (
        <T kind="small">쓴 지 {EDIT_WINDOW_DAYS}일이 지나 원문은 잠겼어요. 대신 답장을 남길 수 있어요.</T>
      )}

      {replies.length || canReply ? (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <T kind="label">답장</T>
          {replies.map((r) => (
            <Pressable
              key={r.id}
              onLongPress={() => {
                if (Date.now() - r.createdAt < 86_400_000) {
                  deleteReply(r.id);
                  bump();
                }
              }}
              style={[styles.reply, { borderColor: c.years[yearIndexInCycle(start, `${r.fromYear}-${mdOf(date)}`)] ?? c.accent }]}>
              <T kind="mono" color={c.years[yearIndexInCycle(start, `${r.fromYear}-${mdOf(date)}`)] ?? c.accent}>
                {r.fromYear}년의 나
              </T>
              <T color={c.ink2}>{r.text}</T>
            </Pressable>
          ))}
          {canReply ? (
            <View style={{ gap: space.sm }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={`${todayYear}년의 나로 한마디 남기기`}
                placeholderTextColor={c.ink3}
                multiline
                maxLength={300}
                style={[styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.surface }]}
                accessibilityLabel="답장"
              />
              <Button
                title="답장 남기기"
                disabled={!draft.trim()}
                onPress={() => {
                  addReply(date, todayYear, draft.trim());
                  setDraft('');
                  bump();
                }}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      <Card style={{ marginTop: space.md }}>
        {annTitle === null ? (
          <Pressable onPress={() => setAnnTitle(entry.tags[0] ?? '')}>
            <T color={c.accent} style={{ fontWeight: '600' }}>매년 이 날 기억하기</T>
            <T kind="small">해마다 {formatKo(date)} 아침에 이 기록을 알려드려요.</T>
          </Pressable>
        ) : (
          <View style={{ gap: space.sm }}>
            <TextInput
              value={annTitle}
              onChangeText={setAnnTitle}
              placeholder="예: 첫 출근 기념일"
              placeholderTextColor={c.ink3}
              style={[styles.input, { color: c.ink, borderColor: c.line, minHeight: 0 }]}
              autoFocus
              accessibilityLabel="연례 행사 이름"
            />
            <Button
              title="연례 행사로 저장"
              disabled={!annTitle.trim()}
              onPress={() => {
                addAnniversary({ title: annTitle.trim(), md: mdOf(date), kind: 'exact', rangeDays: 0, sourceDate: date });
                rescheduleAll().catch(() => {});
                setAnnTitle(null);
                setNotice('연례 행사에 추가했어요.');
              }}
            />
          </View>
        )}
        {notice ? <T kind="small" color={c.accent}>{notice}</T> : null}
      </Card>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md }}>
        {prev?.date ? (
          <Chip label={`↑ ${prev.year}`} color={c.years[prev.k]} onPress={() => router.setParams({ date: prev.date! })} />
        ) : (
          <View />
        )}
        {next?.date ? <Chip label={`${next.year} ↓`} color={c.years[next.k]} onPress={() => router.setParams({ date: next.date! })} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
  reply: { borderLeftWidth: 3, paddingLeft: space.md, paddingVertical: 4, gap: 2 },
  input: { borderWidth: 1, borderRadius: radius.md, padding: space.md, minHeight: 64, fontSize: 15, textAlignVertical: 'top' },
});
