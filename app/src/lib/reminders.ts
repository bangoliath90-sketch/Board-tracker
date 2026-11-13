import * as Notifications from 'expo-notifications';
import * as SMS from 'expo-sms';
import { Platform } from 'react-native';
import { daysUntil, parseDate, shortDate, usd } from './format';
import type { Bag, Board, Person } from './types';

export const DEFAULT_TEMPLATE = 'Hi {name}, just a reminder that {amount} was due on {due}. Thanks!';
export const DEFAULT_DAYS = 1;
const ID_PREFIX = 'remind-';
const CHANNEL = 'reminders';
const NOTIFY_HOUR = 10; // 10:00 local time

export const reminderDays = (board: Board | null) => board?.reminder_days ?? DEFAULT_DAYS;
export const reminderTemplate = (board: Board | null) => board?.reminder_template || DEFAULT_TEMPLATE;

/** Fill {name}, {amount} and {due} in the board's message. */
export function reminderMessage(template: string, bag: Bag, personName: string): string {
  return template
    .replace(/\{name\}/gi, personName)
    .replace(/\{amount\}/gi, usd(bag.price))
    .replace(/\{due\}/gi, bag.due_date ? shortDate(bag.due_date) : 'the due date');
}

/** The moment a reminder becomes due: N days after the due date, at 10:00. */
export function reminderTime(bag: Bag, days: number): Date | null {
  if (!bag.due_date) return null;
  const d = parseDate(bag.due_date);
  d.setDate(d.getDate() + days);
  d.setHours(NOTIFY_HOUR, 0, 0, 0);
  return d;
}

/** True when the bag is owed, far enough past due, and no one has texted since it became due. */
export function isReminderDue(bag: Bag, days: number): boolean {
  if (bag.status !== 'taken' || !bag.due_date) return false;
  if (daysUntil(bag.due_date) > -days) return false;
  if (!bag.reminded_at) return true;
  const since = reminderTime(bag, days);
  return !!since && new Date(bag.reminded_at) < startOfDay(since);
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Open the phone's Messages app with the reminder written out.
 * Returns true if the person sent it (or the phone can't tell us, as on Android).
 */
export async function openTextReminder(phone: string, message: string): Promise<boolean> {
  if (!(await SMS.isAvailableAsync())) throw new Error('This phone cannot send text messages.');
  const { result } = await SMS.sendSMSAsync([phone], message);
  return result !== 'cancelled';
}

/* ---------- notifications ---------- */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let permission: Promise<boolean> | null = null;
function ensurePermission(): Promise<boolean> {
  if (!permission) {
    permission = (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL, {
          name: 'Payment reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return true;
      const asked = await Notifications.requestPermissionsAsync();
      return asked.granted;
    })().catch(() => false);
  }
  return permission;
}

/**
 * Keep one scheduled phone notification per owed bag, at the moment its text reminder
 * becomes due. Runs on every member's phone, so everyone on the board is told.
 */
export async function syncReminderNotifications(bags: Bag[], people: Person[], days: number): Promise<void> {
  const now = Date.now();
  const wanted = new Map<string, { bag: Bag; at: Date }>();
  for (const bag of bags) {
    if (bag.status !== 'taken') continue;
    const at = reminderTime(bag, days);
    if (!at || at.getTime() <= now) continue;
    wanted.set(`${ID_PREFIX}${bag.id}-${at.getTime()}`, { bag, at });
  }

  if (wanted.size > 0 && !(await ensurePermission())) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  const existing = new Set<string>();
  for (const n of scheduled) {
    if (!n.identifier.startsWith(ID_PREFIX)) continue;
    if (wanted.has(n.identifier)) existing.add(n.identifier);
    else await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
  }

  for (const [identifier, { bag, at }] of wanted) {
    if (existing.has(identifier)) continue;
    const name = people.find((p) => p.id === bag.person_id)?.name ?? 'Someone';
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `${name} is overdue`,
        body: `${usd(bag.price)} was due ${bag.due_date ? shortDate(bag.due_date) : ''}. Tap to text a reminder.`,
        data: { bagId: bag.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
    }).catch(() => {});
  }
}
