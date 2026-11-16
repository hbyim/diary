import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PASSCODE_LENGTH } from '@/lib/passcode';
import { fonts, useColors } from '@/theme';

import { T } from './ui';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

/** Numeric keypad with dots. Calls `onComplete` once all digits are entered, then clears. */
export function PinPad({
  title,
  subtitle,
  error,
  disabled,
  onComplete,
  footer,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  disabled?: boolean;
  onComplete: (pin: string) => void | Promise<void>;
  footer?: React.ReactNode;
}) {
  const c = useColors();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (error) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [error]);

  const press = (k: string) => {
    if (busy || disabled) return;
    if (k === '⌫') setPin((p) => p.slice(0, -1));
    else if (k && pin.length < PASSCODE_LENGTH) {
      Haptics.selectionAsync().catch(() => {});
      const next = pin + k;
      setPin(next);
      if (next.length === PASSCODE_LENGTH) {
        setBusy(true);
        Promise.resolve(onComplete(next)).finally(() => {
          setPin('');
          setBusy(false);
        });
      }
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <T kind="title">{title}</T>
        {subtitle ? <T kind="small" style={{ textAlign: 'center' }}>{subtitle}</T> : null}
      </View>
      <View style={styles.dots} accessibilityLabel={`${pin.length}자리 입력됨`}>
        {Array.from({ length: PASSCODE_LENGTH }, (_, i) => (
          <View
            key={i}
            style={[styles.dot, { borderColor: c.ink2, backgroundColor: i < pin.length ? c.ink : 'transparent' }]}
          />
        ))}
      </View>
      <Text style={{ color: c.danger, minHeight: 20, fontSize: 13 }}>{error ?? ''}</Text>
      <View style={styles.grid}>
        {KEYS.map((k, i) => (
          <Pressable
            key={i}
            onPress={() => press(k)}
            disabled={!k}
            accessibilityLabel={k === '⌫' ? '지우기' : k}
            style={({ pressed }) => [
              styles.key,
              { backgroundColor: k && k !== '⌫' ? (pressed ? c.line : c.surface2) : 'transparent', opacity: disabled ? 0.4 : 1 },
            ]}>
            <Text style={{ fontSize: 26, color: c.ink, fontFamily: k === '⌫' ? undefined : fonts.mono }}>{k}</Text>
          </Pressable>
        ))}
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 24 },
  dots: { flexDirection: 'row', gap: 18, marginTop: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', width: 276, gap: 18, justifyContent: 'center' },
  key: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
});
