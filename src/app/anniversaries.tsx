import { useState } from 'react';

import { useApp, useDb } from '@/app-context';
import { Pressable, TextInput, View } from 'react-native';

import { Button, Card, Chip, Screen, Section, Stepper, T } from '@/components/ui';
import { addAnniversary, deleteAnniversary, getAnniversaries } from '@/lib/db';
import { addDays, dayOf, logicalToday, mdOf, monthOf, pad2 } from '@/lib/dates';
import { rescheduleAll } from '@/lib/notifications';
import { radius, space, useColors } from '@/theme';

const RANGE_DAYS = 7;

export default function AnniversariesScreen() {
  const c = useColors();
  const { bump } = useApp();
  const list = useDb(getAnniversaries, []);
  const [title, setTitle] = useState('');
  const [md, setMd] = useState(mdOf(logicalToday()));
  const [kind, setKind] = useState<'exact' | 'range'>('exact');
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);


  // Step the month-day using a leap reference year so Feb 29 is selectable.
  const shiftDay = (n: number) => setMd((m) => mdOf(addDays(`2000-${m}`, n)));
  const shiftMonth = (n: number) =>
    setMd((m) => {
      const mo = ((monthOf(`2000-${m}`) - 1 + n + 12) % 12) + 1;
      const maxDay = new Date(2000, mo, 0).getDate();
      return `${pad2(mo)}-${pad2(Math.min(dayOf(`2000-${m}`), maxDay))}`;
    });

  return (
    <Screen edges={[]}>
      <T kind="small">해마다 돌아오는 날을 기억해 두면, 그날 아침 9시에 지난 기록과 함께 알려드려요.</T>
      {list.length ? (
        <Card>
          {list.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => setPendingDelete(pendingDelete === a.id ? null : a.id)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}>
              <T style={{ flex: 1 }}>{a.title}</T>
              {pendingDelete === a.id ? (
                <Chip
                  label="삭제"
                  color={c.danger}
                  onPress={async () => {
                    deleteAnniversary(a.id);
                    setPendingDelete(null);
                    bump();
                    await rescheduleAll().catch(() => {});
                  }}
                />
              ) : (
                <T kind="mono">
                  {a.md.replace('-', '.')} {a.kind === 'range' ? `±${a.rangeDays}일` : '정확히'}
                </T>
              )}
            </Pressable>
          ))}
        </Card>
      ) : (
        <T kind="small">아직 없어요. 기록 화면의 ‘매년 이 날 기억하기’로도 추가할 수 있어요.</T>
      )}

      <Section title="새 연례 행사">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="예: 첫눈, 결혼기념일, 김장"
          placeholderTextColor={c.ink3}
          style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.md, padding: space.md, color: c.ink, fontSize: 15 }}
          accessibilityLabel="연례 행사 이름"
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T>월</T>
          <Stepper label={`${monthOf(`2000-${md}`)}월`} onMinus={() => shiftMonth(-1)} onPlus={() => shiftMonth(1)} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T>일</T>
          <Stepper label={`${dayOf(`2000-${md}`)}일`} onMinus={() => shiftDay(-1)} onPlus={() => shiftDay(1)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip label="정확히 그날" selected={kind === 'exact'} onPress={() => setKind('exact')} />
          <Chip label={`앞뒤 ${RANGE_DAYS}일 (첫눈처럼)`} selected={kind === 'range'} onPress={() => setKind('range')} />
        </View>
        <Button
          title="추가"
          disabled={!title.trim()}
          onPress={async () => {
            addAnniversary({ title: title.trim(), md, kind, rangeDays: kind === 'range' ? RANGE_DAYS : 0, sourceDate: null });
            setTitle('');
            bump();
            await rescheduleAll().catch(() => {});
          }}
        />
      </Section>
    </Screen>
  );
}
