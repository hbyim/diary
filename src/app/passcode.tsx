import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/app-context';
import { PinPad } from '@/components/pin-pad';
import { T } from '@/components/ui';
import { clearPasscode, setPasscode, verifyPasscode } from '@/lib/passcode';
import { space, useColors } from '@/theme';

type Mode = 'set' | 'change' | 'disable';
type Step = 'verify' | 'new' | 'confirm';

/** Set, change or turn off the 4-digit app passcode. */
export default function PasscodeScreen() {
  const { mode = 'set' } = useLocalSearchParams<{ mode?: Mode }>();
  const { updateSettings } = useApp();
  const c = useColors();
  const [step, setStep] = useState<Step>(mode === 'set' ? 'new' : 'verify');
  const [first, setFirst] = useState('');
  const [error, setError] = useState<string | null>(null);

  const titles: Record<Step, string> = {
    verify: '지금 비밀번호',
    new: mode === 'change' ? '새 비밀번호' : '비밀번호 만들기',
    confirm: '한 번 더 입력',
  };

  const onComplete = async (pin: string) => {
    if (step === 'verify') {
      const r = await verifyPasscode(pin);
      if (!r.ok) {
        setError(r.waitMs > 0 ? `${Math.ceil(r.waitMs / 1000)}초 후에 다시 시도하세요.` : '비밀번호가 맞지 않아요.');
        return;
      }
      setError(null);
      if (mode === 'disable') {
        await clearPasscode();
        updateSettings({ lockEnabled: false });
        router.back();
      } else setStep('new');
      return;
    }
    if (step === 'new') {
      setFirst(pin);
      setError(null);
      setStep('confirm');
      return;
    }
    if (pin !== first) {
      setError('두 번 입력한 비밀번호가 달라요. 처음부터 다시 입력하세요.');
      setFirst('');
      setStep('new');
      return;
    }
    await setPasscode(pin);
    updateSettings({ lockEnabled: true });
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: space.lg }}>
        <T color={c.ink3}>취소</T>
      </Pressable>
      <PinPad
        title={titles[step]}
        subtitle={
          step === 'new'
            ? '숫자 4자리. 잊어버리면 되찾을 방법이 없으니 꼭 기억해 두세요.'
            : step === 'confirm'
              ? '확인을 위해 같은 번호를 입력하세요.'
              : undefined
        }
        error={error}
        onComplete={onComplete}
      />
    </SafeAreaView>
  );
}
