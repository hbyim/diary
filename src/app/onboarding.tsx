import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useApp } from '@/app-context';
import { Button, Card, Row, Screen, Stepper, T, Toggle } from '@/components/ui';
import { CYCLE_YEARS, addDays, addYears, diffDays, logicalToday, pad2, yearOf } from '@/lib/dates';
import { ensurePermission, rescheduleAll } from '@/lib/notifications';
import { clearPasscode } from '@/lib/passcode';
import type { QuestionMode } from '@/lib/settings';
import { fonts, radius, space, useColors } from '@/theme';

export default function Onboarding() {
  const { settings, updateSettings } = useApp();
  const c = useColors();
  const today = logicalToday();
  const [step, setStep] = useState(0);
  const [start, setStart] = useState(today);
  const [hour, setHour] = useState(22);
  const [minute, setMinute] = useState(30);
  const [notify, setNotify] = useState(Platform.OS !== 'web');
  const [mode, setMode] = useState<QuestionMode>('daily');

  const end = addDays(addYears(start, CYCLE_YEARS), -1);
  const total = diffDays(start, end) + 1;
  const jan1 = `${yearOf(today)}-01-01`;

  const [finished, setFinished] = useState(false);

  const shiftTime = (d: number) => {
    const t = (((hour * 60 + minute + d) % 1440) + 1440) % 1440;
    setHour(Math.floor(t / 60));
    setMinute(t % 60);
  };

  const finish = async () => {
    if (!settings.lockEnabled) await clearPasscode(); // drop any passcode left in the keychain by a previous install
    let notifyOk = notify;
    if (notify) notifyOk = await ensurePermission().catch(() => false);
    setFinished(true);
    updateSettings({
      startDate: start,
      notifyEnabled: notifyOk,
      notifyHour: hour,
      notifyMinute: minute,
      questionMode: mode,
      onboarded: true,
    });
    await rescheduleAll().catch(() => {});
    router.replace('/');
    router.push({ pathname: '/write', params: { date: today } });
  };

  // Reaching onboarding after it is done (e.g. a stale link) goes home.
  if (settings.onboarded && !finished) return <Redirect href="/" />;

  return (
    <Screen edges={['top', 'bottom']} contentStyle={{ paddingTop: space.xl, gap: space.lg, flexGrow: 1 }}>
      <T kind="small">{step + 1} / 3</T>

      {step === 0 ? (
        <>
          <T kind="display" style={{ lineHeight: 42 }}>당신의 다섯 해는{'\n'}언제 시작할까요?</T>
          <View style={{ gap: space.sm }}>
            <Choice selected={start === today} title="오늘부터" hint={`${today.replaceAll('-', '.')}에 시작해요`} onPress={() => setStart(today)} />
            {jan1 !== today ? (
              <Choice
                selected={start === jan1}
                title="올해 1월 1일부터"
                hint="달력과 해가 딱 맞아요. 지나간 날은 비어 있는 채로 시작해요"
                onPress={() => setStart(jan1)}
              />
            ) : null}
          </View>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T kind="mono">{start.replaceAll('-', '.')}</T>
              <T kind="mono">{end.replaceAll('-', '.')}</T>
            </View>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {c.years.map((col, i) => (
                <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i === 0 ? col : c.surface2 }} />
              ))}
            </View>
            <T style={{ fontFamily: fonts.display, fontSize: 32, fontWeight: '700' }}>
              {total.toLocaleString()}
              <T kind="small"> 개의 오늘</T>
            </T>
            <T kind="small">5년 뒤 같은 날, 첫 번째 칸이 다섯 칸으로 채워져요.</T>
          </Card>
          <View style={{ flex: 1 }} />
          <Button title="다음" onPress={() => setStep(1)} />
        </>
      ) : step === 1 ? (
        <>
          <T kind="display" style={{ lineHeight: 42 }}>{Platform.OS === 'web' ? '어떻게\n쓰고 싶나요?' : '하루 중 언제\n쓰고 싶나요?'}</T>
          {Platform.OS !== 'web' ? <Row label="매일 쓰기 알림" right={<Toggle value={notify} onChange={setNotify} />} /> : null}
          {notify && Platform.OS !== 'web' ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <T>알림 시간</T>
              <Stepper label={`${pad2(hour)}:${pad2(minute)}`} onMinus={() => shiftTime(-30)} onPlus={() => shiftTime(30)} />
            </View>
          ) : null}
          <T kind="small">잠들기 전에 쓰는 사람이 가장 오래 이어가요. 새벽 3시 전에 쓰면 전날의 칸에 들어가요.</T>
          <T kind="label" style={{ marginTop: space.md }}>질문 방식</T>
          <Choice selected={mode === 'daily'} title="매일 다른 질문 (추천)" hint="365개의 질문이 해마다 같은 날 돌아와요" onPress={() => setMode('daily')} />
          <Choice selected={mode === 'free'} title="질문 없이 자유롭게" hint="“오늘은 어땠나요?”만 물어요" onPress={() => setMode('free')} />
          <View style={{ flex: 1 }} />
          <Button title="다음" onPress={() => setStep(2)} />
          <Button title="이전" variant="ghost" onPress={() => setStep(0)} />
        </>
      ) : (
        <>
          <T kind="display" style={{ lineHeight: 42 }}>나만 볼 수 있게{'\n'}잠가 둘까요?</T>
          <T kind="small">켜 두면 앱을 열 때마다 4자리 비밀번호를 물어요. 비밀번호를 잊으면 기록을 되찾을 수 없어요.</T>
          <Row
            label="비밀번호 잠금"
            hint={settings.lockEnabled ? '설정됨' : '나중에 ‘나’ 탭에서도 켤 수 있어요'}
            right={
              <Toggle
                value={settings.lockEnabled}
                onChange={(v) => router.push({ pathname: '/passcode', params: { mode: v ? 'set' : 'disable' } })}
              />
            }
          />
          <T kind="small">
            {Platform.OS === 'web'
              ? '웹 체험판이에요. 기록은 이 브라우저에만 저장되고, 회원가입 없이 바로 시작해요.'
              : '모든 기록은 이 기기 안에만 저장되고, 회원가입 없이 바로 시작해요.'}
          </T>
          <View style={{ flex: 1 }} />
          <Button title="첫 번째 칸 쓰기" onPress={finish} />
          <Button title="이전" variant="ghost" onPress={() => setStep(1)} />
        </>
      )}
    </Screen>
  );
}

function Choice({ selected, title, hint, onPress }: { selected: boolean; title: string; hint: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[styles.choice, { borderColor: selected ? c.accent : c.line, borderWidth: selected ? 1.5 : 1, backgroundColor: c.surface }]}>
      <T style={{ fontWeight: '600' }}>{title}</T>
      <T kind="small">{hint}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: { borderRadius: radius.md, padding: space.md, gap: 2 },
});
