import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/app-context';
import { MoodPicker, TagEditor } from '@/components/diary-bits';
import { Button, Chip, T } from '@/components/ui';
import { deleteEntry, getEntry, saveEntry, setCustomQuestion, tagFrequencies } from '@/lib/db';
import { cellState, formatKo, isLocked, mdOf, weekdayKo, yearIndexInCycle, yearOf } from '@/lib/dates';
import { pageCells, questionFor } from '@/lib/diary';
import { deletePhoto, pickPhoto } from '@/lib/photos';
import { MAX_WIDTH } from '@/hooks/use-layout';
import { fonts, radius, space, useColors } from '@/theme';

const SOFT_LIMIT = 300;
const MEMO_LIMIT = 100;

export default function WriteScreen() {
  const { date, memo } = useLocalSearchParams<{ date: string; memo?: string }>();
  const { today, start, settings, bump } = useApp();
  const c = useColors();
  const md = mdOf(date);
  const existing = useMemo(() => getEntry(date), [date]);
  const state = cellState(date, today, start);
  const isMemo = existing ? existing.kind === 'memo' : memo === '1' || state === 'past';
  const color = c.years[yearIndexInCycle(start, date)];

  const [text, setText] = useState(existing?.text ?? '');
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [photo, setPhoto] = useState<string | null>(existing?.photo ?? null);
  const [question, setQuestion] = useState(existing?.question || questionFor(md, settings.questionMode));
  const [editingQ, setEditingQ] = useState(false);
  const [qDraft, setQDraft] = useState(question);
  const [peekOpen, setPeekOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = useRef(false);

  const locked = existing ? isLocked(existing.writtenAt) : false;
  const allowed = state !== 'future' && state !== 'before-start' && state !== 'none' && !locked;

  useEffect(() => {
    if (locked) router.replace({ pathname: '/entry', params: { date } });
  }, [locked, date]);

  const others = useMemo(
    () => pageCells(start, date, today).filter((x) => x.entry && x.date !== date && x.entry.kind === 'entry'),
    [start, date, today],
  );
  const peek = others.filter((x) => x.year < yearOf(date)).pop() ?? null;

  const suggestions = useMemo(() => {
    const sameDay = others.flatMap((x) => x.entry!.tags);
    return [...new Set([...sameDay, ...tagFrequencies().map((t) => t.tag)])];
  }, [others]);

  const hasContent = text.trim().length > 0 || tags.length > 0 || mood !== null || photo !== null;

  const [saveError, setSaveError] = useState<string | null>(null);

  const persist = () => {
    if (!allowed || !hasContent) return false;
    try {
      saveEntry({
      date,
      kind: isMemo ? 'memo' : 'entry',
      question,
      text: isMemo ? text.trim().slice(0, MEMO_LIMIT) : text,
      mood: isMemo ? null : mood,
      tags: isMemo ? [] : tags,
      photo: isMemo ? null : photo,
        late: date < today,
      });
    } catch {
      // Only the web build can run out of space (browser storage holds the photos).
      setSaveError('저장 공간이 가득 찼어요. 사진을 빼거나 기록을 내보낸 뒤 정리해 주세요.');
      return false;
    }
    setSaveError(null);
    dirty.current = false;
    setSavedAt(Date.now());
    bump();
    return true;
  };

  // Autosave shortly after the user stops typing.
  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(persist, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, tags, mood, photo]);

  const touch =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      dirty.current = true;
      set(v);
    };

  const finish = () => {
    const saved = persist() || !!existing;
    if (!existing && saved && !isMemo) router.replace({ pathname: '/saved', params: { date } });
    else router.back();
  };

  const close = () => {
    if (dirty.current) persist();
    router.back();
  };

  if (!allowed && !locked) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: space.lg, gap: space.lg, justifyContent: 'center' }}>
        <T kind="title">{state === 'future' ? '아직 오지 않은 날이에요' : '이 날에는 쓸 수 없어요'}</T>
        <Button title="돌아가기" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top', 'bottom']}>
      <View style={[styles.header, styles.column, { borderColor: c.line }]}>
        <Pressable onPress={close} hitSlop={10}>
          <T color={c.ink3}>닫기</T>
        </Pressable>
        <T kind="mono" color={color} style={{ fontWeight: '600' }}>
          {date.replaceAll('-', '.')} {weekdayKo(date)}
        </T>
        <Pressable onPress={finish} hitSlop={10} disabled={!hasContent}>
          <T color={hasContent ? c.accent : c.ink3} style={{ fontWeight: '700' }}>저장</T>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.column, { padding: space.lg, gap: space.lg, paddingBottom: 60 }]} keyboardShouldPersistTaps="handled">
          {date < today ? (
            <Chip label={isMemo ? `${formatKo(date)}의 기억 메모 · 그날 쓴 기록과 구분돼요` : '나중에 씀 표시가 붙어요'} color={c.years[0]} />
          ) : null}

          {isMemo ? (
            <T kind="question">그날에 대해 기억나는 것을 한 줄로 남겨요</T>
          ) : editingQ ? (
            <View style={{ gap: space.sm }}>
              <TextInput
                value={qDraft}
                onChangeText={setQDraft}
                style={[styles.qInput, { color: c.ink, borderColor: c.line, fontFamily: fonts.display }]}
                autoFocus
                accessibilityLabel="이 날짜의 질문"
              />
              <T kind="small">바꾼 질문은 내년 {formatKo(date)}에도 그대로 나와요.</T>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button
                  title="질문 저장"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setCustomQuestion(md, qDraft);
                    const q = qDraft.trim() || questionFor(md, settings.questionMode);
                    setQuestion(q);
                    setEditingQ(false);
                    dirty.current = true;
                  }}
                />
                <Button
                  title="기본 질문"
                  variant="ghost"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setCustomQuestion(md, null);
                    const q = questionFor(md, settings.questionMode);
                    setQuestion(q);
                    setQDraft(q);
                    setEditingQ(false);
                  }}
                />
              </View>
            </View>
          ) : (
            <Pressable onLongPress={() => setEditingQ(true)} accessibilityHint="길게 누르면 질문을 바꿀 수 있어요">
              <T kind="question" style={{ fontSize: 19, lineHeight: 28 }}>{question}</T>
              <T kind="small">질문을 길게 누르면 바꿀 수 있어요</T>
            </Pressable>
          )}

          {!isMemo && peek ? (
            <Pressable
              onPress={() => setPeekOpen((v) => !v)}
              style={[styles.peek, { borderColor: c.line }]}
              accessibilityState={{ expanded: peekOpen }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T kind="small">{peek.year}년의 답 보기</T>
                <T kind="small">{peekOpen ? '접기 ▴' : '펼치기 ▾'}</T>
              </View>
              {peekOpen ? <T color={c.ink2}>{peek.entry!.text}</T> : null}
            </Pressable>
          ) : null}

          <TextInput
            value={text}
            onChangeText={touch(setText)}
            multiline
            maxLength={isMemo ? MEMO_LIMIT : 5000}
            placeholder={isMemo ? '예: 친구 결혼식에 다녀왔던 것 같다' : '오늘의 답을 적어보세요'}
            placeholderTextColor={c.ink3}
            style={[styles.text, { color: c.ink, minHeight: isMemo ? 60 : 180 }]}
            autoFocus={!existing}
            textAlignVertical="top"
            accessibilityLabel="본문"
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <T kind="small" color={saveError ? c.danger : undefined}>
              {saveError ?? (savedAt ? '자동 저장됨' : existing ? '저장된 기록' : ' ')}
            </T>
            <T kind="mono" color={text.length > (isMemo ? MEMO_LIMIT : SOFT_LIMIT) ? c.years[0] : c.ink3}>
              {text.length} / {isMemo ? MEMO_LIMIT : SOFT_LIMIT}
            </T>
          </View>

          {!isMemo ? (
            <>
              <View style={{ gap: space.sm }}>
                <T kind="label">오늘 한 일</T>
                <TagEditor tags={tags} onChange={touch(setTags)} suggestions={suggestions} color={color} />
              </View>
              <View style={{ gap: space.sm }}>
                <T kind="label">기분</T>
                <MoodPicker value={mood} onChange={touch(setMood)} />
              </View>
              <View style={{ gap: space.sm }}>
                <T kind="label">사진 1장</T>
                {photo ? (
                  <View style={{ gap: space.sm }}>
                    <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" accessibilityLabel="오늘의 사진" />
                    <Button
                      title="사진 빼기"
                      variant="ghost"
                      onPress={() => {
                        if (photo !== existing?.photo) deletePhoto(photo);
                        touch(setPhoto)(null);
                      }}
                    />
                  </View>
                ) : (
                  <Button
                    title="사진 고르기"
                    variant="ghost"
                    onPress={async () => {
                      const uri = await pickPhoto();
                      if (uri) touch(setPhoto)(uri);
                    }}
                  />
                )}
              </View>
            </>
          ) : null}

          {existing ? (
            confirmDelete ? (
              <View style={{ gap: space.sm }}>
                <T kind="small">이 날의 기록과 답장이 모두 지워지고 되돌릴 수 없어요.</T>
                <Button
                  title="정말 지우기"
                  variant="danger"
                  onPress={() => {
                    deletePhoto(existing.photo);
                    deleteEntry(date);
                    bump();
                    router.back();
                  }}
                />
                <Button title="취소" variant="ghost" onPress={() => setConfirmDelete(false)} />
              </View>
            ) : (
              <Button title="기록 지우기" variant="danger" onPress={() => setConfirmDelete(true)} />
            )
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Keeps the editor at a comfortable line length on tablets and desktop browsers.
  column: { width: '100%', maxWidth: MAX_WIDTH.reading, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 16, lineHeight: 26 },
  qInput: { borderWidth: 1, borderRadius: radius.md, padding: space.md, fontSize: 17 },
  peek: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.md, padding: space.md, gap: space.sm },
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md },
});
