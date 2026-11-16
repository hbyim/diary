import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '@/app-context';
import { consumeSuppression } from '@/lib/lock-events';
import { remainingLockout, verifyPasscode } from '@/lib/passcode';
import { fonts, useColors } from '@/theme';

import { PinPad } from './pin-pad';
import { T } from './ui';

/**
 * Covers the whole app with the passcode screen when the lock is on:
 * at launch and every time the app comes back from the background.
 * While the app is inactive (app switcher), a plain cover hides the diary.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const { settings } = useApp();
  const c = useColors();
  const [locked, setLocked] = useState(settings.lockEnabled);
  const [covered, setCovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const enabled = useRef(settings.lockEnabled);
  useEffect(() => {
    enabled.current = settings.lockEnabled;
  }, [settings.lockEnabled]);
  const showLock = locked && settings.lockEnabled;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        setCovered(false);
        return;
      }
      setCovered(true);
      if (s === 'background' && enabled.current && !consumeSuppression()) setLocked(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!showLock) return;
    remainingLockout().then(setWait);
  }, [showLock]);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => Math.max(0, w - 1000)), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (pin: string) => {
    const r = await verifyPasscode(pin);
    if (r.ok) {
      setError(null);
      setLocked(false);
    } else {
      setWait(r.waitMs);
      setError(r.waitMs > 0 ? `${r.attempts}번 틀렸어요. 잠시 후 다시 시도하세요.` : '비밀번호가 맞지 않아요.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      {showLock ? (
        <SafeAreaView style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
          <PinPad
            title="나이테"
            subtitle="비밀번호를 입력하세요"
            error={wait > 0 ? `${Math.ceil(wait / 1000)}초 후에 다시 시도할 수 있어요.` : error}
            disabled={wait > 0}
            onComplete={submit}
            footer={
              <T kind="small" style={{ textAlign: 'center', marginTop: 8 }}>
                비밀번호를 잊으면 기록을 되살릴 수 없어요.{'\n'}앱을 삭제하고 다시 설치하면 새로 시작할 수 있어요.
              </T>
            }
          />
        </SafeAreaView>
      ) : covered && settings.lockEnabled ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }]}>
          <T kind="display" style={{ fontFamily: fonts.display }}>나이테</T>
        </View>
      ) : null}
    </View>
  );
}
