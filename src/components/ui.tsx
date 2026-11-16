import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { MAX_WIDTH, useLayout } from '@/hooks/use-layout';
import { fonts, radius, space, useColors } from '@/theme';

/**
 * Page wrapper. On wide screens the content is centred at `maxWidth`
 * so lines and cards stay a readable size on tablets and desktop browsers.
 */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  maxWidth = MAX_WIDTH.reading,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  maxWidth?: number;
}) {
  const c = useColors();
  const { isWide } = useLayout();
  const frame: ViewStyle = { width: '100%', maxWidth, alignSelf: 'center', paddingTop: isWide ? space.xl : space.md };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, frame, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, frame, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type TextKind = 'display' | 'title' | 'question' | 'body' | 'small' | 'mono' | 'label';

export function T({
  kind = 'body',
  color,
  style,
  children,
  numberOfLines,
}: {
  kind?: TextKind;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
}) {
  const c = useColors();
  const base: Record<TextKind, TextStyle> = {
    display: { fontFamily: fonts.display, fontSize: 30, fontWeight: '700', color: c.ink, letterSpacing: -0.5 },
    title: { fontFamily: fonts.display, fontSize: 21, fontWeight: '700', color: c.ink },
    question: { fontFamily: fonts.display, fontSize: 17, fontWeight: '500', color: c.ink, lineHeight: 25 },
    body: { fontSize: 15, color: c.ink, lineHeight: 23 },
    small: { fontSize: 12.5, color: c.ink3, lineHeight: 18 },
    mono: { fontFamily: fonts.mono, fontSize: 12.5, color: c.ink2 },
    label: { fontSize: 12.5, fontWeight: '600', color: c.ink2, letterSpacing: 0.2 },
  };
  return (
    <Text style={[base[kind], color ? { color } : null, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const bg = variant === 'primary' ? c.accent : 'transparent';
  const fg = variant === 'primary' ? c.accentInk : variant === 'danger' ? c.danger : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: variant === 'primary' ? c.accent : c.line, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function Chip({ label, color, onPress, selected }: { label: string; color?: string; onPress?: () => void; selected?: boolean }) {
  const c = useColors();
  const col = color ?? c.accent;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        { backgroundColor: selected === false ? 'transparent' : col + '22', borderColor: selected === false ? c.line : 'transparent' },
      ]}>
      <Text style={{ color: selected === false ? c.ink2 : col, fontSize: 12.5, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ label, hint, right, onPress }: { label: string; hint?: string; right?: ReactNode; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, { borderColor: c.line, opacity: pressed ? 0.6 : 1 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T>{label}</T>
        {hint ? <T kind="small">{hint}</T> : null}
      </View>
      {right ?? (onPress ? <T kind="mono" color={c.ink3}>›</T> : null)}
    </Pressable>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.line }} />;
}

export function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  const c = useColors();
  const btn = (s: string, f: () => void, a11y: string) => (
    <Pressable accessibilityLabel={a11y} onPress={f} hitSlop={8} style={[styles.step, { borderColor: c.line }]}>
      <Text style={{ color: c.ink, fontSize: 18 }}>{s}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      {btn('−', onMinus, '줄이기')}
      <T kind="mono" style={{ fontSize: 16, color: c.ink, minWidth: 64, textAlign: 'center' }}>
        {label}
      </T>
      {btn('+', onPlus, '늘리기')}
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <T kind="label">{title}</T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xxl, gap: space.md },
  btn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', borderWidth: 1 },
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, gap: space.md },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});

function flatten(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) =>
    isValidElement(child) && child.type === Fragment ? flatten((child.props as { children?: ReactNode }).children) : [child],
  );
}

/**
 * Stacks its children on phones. With `two`, deals them alternately into two
 * independent columns, so cards of different heights don't leave gaps between rows.
 */
export function Columns({ two, gap, children }: { two: boolean; gap: number; children: ReactNode }) {
  const items = flatten(children);
  if (!two) return <View style={{ gap }}>{items}</View>;
  return (
    <View style={{ flexDirection: 'row', gap, alignItems: 'flex-start' }}>
      {[0, 1].map((col) => (
        <View key={col} style={{ flex: 1, gap, minWidth: 0 }}>
          {items.filter((_, i) => i % 2 === col)}
        </View>
      ))}
    </View>
  );
}
