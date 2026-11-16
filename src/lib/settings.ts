import { getSetting, setSetting } from './db';
import type { ISODate } from './dates';

export type QuestionMode = 'daily' | 'free';

export type Settings = {
  onboarded: boolean;
  startDate: ISODate | null;
  notifyEnabled: boolean;
  notifyHour: number;
  notifyMinute: number;
  questionMode: QuestionMode;
  lockEnabled: boolean;
  hideNotificationText: boolean;
};

export function loadSettings(): Settings {
  return {
    onboarded: getSetting('onboarded') === '1',
    startDate: getSetting('start_date'),
    notifyEnabled: getSetting('notify_enabled') !== '0',
    notifyHour: Number(getSetting('notify_hour') ?? 22),
    notifyMinute: Number(getSetting('notify_minute') ?? 30),
    questionMode: (getSetting('question_mode') as QuestionMode) ?? 'daily',
    lockEnabled: getSetting('lock_enabled') === '1',
    hideNotificationText: getSetting('hide_notification_text') === '1',
  };
}

const KEYS: Record<keyof Settings, string> = {
  onboarded: 'onboarded',
  startDate: 'start_date',
  notifyEnabled: 'notify_enabled',
  notifyHour: 'notify_hour',
  notifyMinute: 'notify_minute',
  questionMode: 'question_mode',
  lockEnabled: 'lock_enabled',
  hideNotificationText: 'hide_notification_text',
};

export function saveSettings(patch: Partial<Settings>) {
  for (const [k, v] of Object.entries(patch) as [keyof Settings, Settings[keyof Settings]][]) {
    if (v === null || v === undefined) continue;
    setSetting(KEYS[k], typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  }
}
