import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useApp } from '@/app-context';
import { useColors } from '@/theme';

function TabIcon({ name, color }: { name: 'today' | 'rings' | 'discover' | 'me'; color: ColorValue }) {
  const s = { stroke: color, strokeWidth: 1.8, fill: 'none' } as const;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {name === 'today' ? (
        <>
          <Rect x={4} y={5} width={16} height={15} rx={2} {...s} />
          <Path d="M4 10h16M9 3v4M15 3v4" {...s} />
        </>
      ) : name === 'rings' ? (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Circle cx={12} cy={12} r={5.5} {...s} />
          <Circle cx={12} cy={12} r={2} {...s} />
        </>
      ) : name === 'discover' ? (
        <>
          <Path d="M4 7h16M4 12h10M4 17h13" {...s} />
        </>
      ) : (
        <>
          <Circle cx={12} cy={8.5} r={3.8} {...s} />
          <Path d="M4.5 20c1.2-3.6 4-5.2 7.5-5.2s6.3 1.6 7.5 5.2" {...s} />
        </>
      )}
    </Svg>
  );
}

export default function TabsLayout() {
  const c = useColors();
  const { settings } = useApp();
  if (!settings.onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.ink3,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        sceneStyle: { backgroundColor: c.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: '달력', tabBarIcon: ({ color }) => <TabIcon name="today" color={color} /> }} />
      <Tabs.Screen name="rings" options={{ title: '나이테', tabBarIcon: ({ color }) => <TabIcon name="rings" color={color} /> }} />
      <Tabs.Screen name="discover" options={{ title: '발견', tabBarIcon: ({ color }) => <TabIcon name="discover" color={color} /> }} />
      <Tabs.Screen name="me" options={{ title: '나', tabBarIcon: ({ color }) => <TabIcon name="me" color={color} /> }} />
    </Tabs>
  );
}
