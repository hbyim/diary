import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { useApp } from '@/app-context';
import { Button, Card, Row, Screen, Section, Stepper, T, Toggle } from '@/components/ui';
import { countReplies, exportAll, getAllEntries, wipeAll } from '@/lib/db';
import { CYCLE_YEARS, addDays, addYears, pad2 } from '@/lib/dates';
import { suppressNextLock } from '@/lib/lock-events';
import { ensurePermission, rescheduleAll } from '@/lib/notifications';
import { clearPasscode } from '@/lib/passcode';
import { deleteAllPhotos } from '@/lib/photos';
import { radius, space, useColors } from '@/theme';

const RESET_WORD = '초기화';

export default function MeScreen() {
  const { settings, updateSettings, start, bump } = useApp();
  const c = useColors();
  const [msg, setMsg] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');

  const entries = getAllEntries();
  const end = addDays(addYears(start, CYCLE_YEARS), -1);

  const setTime = async (deltaMin: number) => {
    let total = (settings.notifyHour * 60 + settings.notifyMinute + deltaMin + 1440) % 1440;
    total = Math.round(total / 30) * 30 % 1440;
    updateSettings({ notifyHour: Math.floor(total / 60), notifyMinute: total % 60 });
    await rescheduleAll();
  };

  const exportJson = async () => {
    try {
      const file = new File(Paths.cache, `naite-export-${new Date().toISOString().slice(0, 10)}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(JSON.stringify(exportAll(), null, 2));
      if (await Sharing.isAvailableAsync()) {
        suppressNextLock();
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: '나이테 기록 내보내기' });
      } else {
        setMsg(`파일을 만들었어요: ${file.uri}`);
      }
    } catch (e) {
      setMsg(`내보내기에 실패했어요: ${(e as Error).message}`);
    }
  };

  return (
    <Screen>
      <T kind="title">나</T>

      <Card>
        <T kind="label">나의 다섯 해</T>
        <T kind="mono" style={{ color: c.ink, fontSize: 15 }}>
          {start.replaceAll('-', '.')} — {end.replaceAll('-', '.')}
        </T>
        <T kind="small">
          기록 {entries.filter((e) => e.kind === 'entry').length}일 · 기억 메모 {entries.filter((e) => e.kind === 'memo').length}개 · 답장 {countReplies()}개
        </T>
      </Card>

      <Section title="알림">
        <Row
          label="매일 쓰기 알림"
          hint="하루 한 번, 놓쳐도 다시 보내지 않아요"
          right={
            <Toggle
              value={settings.notifyEnabled}
              onChange={async (v) => {
                if (v && !(await ensurePermission())) {
                  setMsg('알림 권한이 꺼져 있어요. 기기 설정에서 나이테 알림을 허용해 주세요.');
                  return;
                }
                updateSettings({ notifyEnabled: v });
                await rescheduleAll();
              }}
            />
          }
        />
        {settings.notifyEnabled ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.sm }}>
            <T>알림 시간</T>
            <Stepper label={`${pad2(settings.notifyHour)}:${pad2(settings.notifyMinute)}`} onMinus={() => setTime(-30)} onPlus={() => setTime(30)} />
          </View>
        ) : null}
        <Row
          label="알림에 기록 내용 숨기기"
          hint="잠금 화면에 과거 기록이 보이지 않아요"
          right={
            <Toggle
              value={settings.hideNotificationText}
              onChange={async (v) => {
                updateSettings({ hideNotificationText: v });
                await rescheduleAll();
              }}
            />
          }
        />
        <Row label="나의 연례 행사" onPress={() => router.push('/anniversaries')} />
      </Section>

      <Section title="질문">
        <Row
          label="매일 다른 질문"
          hint={settings.questionMode === 'daily' ? '365개의 질문을 해마다 반복해요' : '지금은 “오늘은 어땠나요?”만 물어요'}
          right={<Toggle value={settings.questionMode === 'daily'} onChange={(v) => updateSettings({ questionMode: v ? 'daily' : 'free' })} />}
        />
      </Section>

      <Section title="잠금">
        <Row
          label="비밀번호 잠금"
          hint="앱을 열 때와 다시 돌아올 때 4자리 비밀번호를 물어요"
          right={
            <Toggle
              value={settings.lockEnabled}
              onChange={(v) => router.push({ pathname: '/passcode', params: { mode: v ? 'set' : 'disable' } })}
            />
          }
        />
        {settings.lockEnabled ? <Row label="비밀번호 바꾸기" onPress={() => router.push({ pathname: '/passcode', params: { mode: 'change' } })} /> : null}
      </Section>

      <Section title="데이터">
        <Row label="기록 내보내기 (JSON)" hint="모든 기록·답장·설정을 파일 하나로 저장해요. 사진은 포함되지 않아요." onPress={exportJson} />
        <Row label="데이터 초기화" hint="모든 기록과 사진을 지우고 처음부터 시작해요" onPress={() => setResetOpen((v) => !v)} />
        {resetOpen ? (
          <Card>
            <T kind="small">되돌릴 수 없어요. 계속하려면 아래에 “{RESET_WORD}”라고 입력하세요.</T>
            <TextInput
              value={resetText}
              onChangeText={setResetText}
              placeholder={RESET_WORD}
              placeholderTextColor={c.ink3}
              style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: space.md, color: c.ink }}
              accessibilityLabel="초기화 확인 입력"
            />
            <Button
              title="모든 기록 지우기"
              variant="danger"
              disabled={resetText.trim() !== RESET_WORD}
              onPress={async () => {
                wipeAll();
                deleteAllPhotos();
                await clearPasscode();
                await rescheduleAll().catch(() => {});
                bump();
                updateSettings({ onboarded: false });
              }}
            />
          </Card>
        ) : null}
      </Section>

      {msg ? <T kind="small" color={c.accent}>{msg}</T> : null}
      <T kind="small" style={{ textAlign: 'center', marginTop: space.lg }}>
        나이테 1.0 · 모든 기록은 이 기기 안에만 저장돼요
      </T>
    </Screen>
  );
}
