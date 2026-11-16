import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, dayOf, monthOf, type MonthDay } from './dates';
import { getAnniversaries } from './db';
import { loadSettings } from './settings';

if (Platform.OS !== 'web') Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL = 'daily';

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: '매일 기록 알림',
      // eslint-disable-next-line import/namespace -- exported from the package index; the resolver misses it
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Month/day a few days before `md` (computed in a non-leap reference year). */
function shiftMd(md: MonthDay, days: number) {
  const iso = addDays(`2001-${md === '02-29' ? '02-28' : md}`, days);
  return { month: monthOf(iso), day: dayOf(iso) };
}

/**
 * Rebuilds every scheduled notification from current settings:
 * one daily reminder plus one yearly reminder per anniversary.
 * Safe to call any time; it cancels everything first.
 */
export async function rescheduleAll() {
  if (Platform.OS === 'web') return;
  const s = loadSettings();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!s.onboarded || !s.notifyEnabled) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  await Notifications.scheduleNotificationAsync({
    content: { title: '나이테', body: '오늘의 칸이 기다리고 있어요. 지난 해의 오늘도 함께 보세요.' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: s.notifyHour,
      minute: s.notifyMinute,
      channelId: CHANNEL,
    },
  });

  for (const a of getAnniversaries()) {
    const when = a.kind === 'range' ? shiftMd(a.md, -a.rangeDays) : shiftMd(a.md, 0);
    const body = s.hideNotificationText
      ? '오늘은 기억해둔 날이에요.'
      : a.kind === 'range'
        ? `이맘때 '${a.title}'을(를) 기록했어요. 올해는 어떨까요?`
        : `오늘은 '${a.title}'. 지난 해의 기록을 열어보세요.`;
    await Notifications.scheduleNotificationAsync({
      content: { title: '나이테 · 연례 행사', body, data: { md: a.md } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: when.month,
        day: when.day,
        hour: 9,
        minute: 0,
        channelId: CHANNEL,
      },
    });
  }
}
