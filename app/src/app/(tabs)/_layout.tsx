import * as Notifications from 'expo-notifications';
import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { useBoard } from '../../lib/board';
import { daysUntil } from '../../lib/format';
import { isReminderDue, reminderDays, syncReminderNotifications } from '../../lib/reminders';
import { useColors } from '../../lib/theme';

const handled = new Set<string>();

export default function TabsLayout() {
  const c = useColors();
  const { board, bags, people } = useBoard();
  const days = reminderDays(board);
  const overdue = bags.filter((b) => b.status === 'taken' && b.due_date && daysUntil(b.due_date) < 0).length;
  const textsDue = bags.filter((b) => isReminderDue(b, days)).length;

  // Keep a phone notification scheduled for each owed bag's reminder date.
  useEffect(() => {
    syncReminderNotifications(bags, people, days).catch(() => {});
  }, [bags, people, days]);

  // Tapping a reminder notification opens that bag.
  useEffect(() => {
    const open = (r: Notifications.NotificationResponse | null) => {
      if (!r || handled.has(r.notification.request.identifier)) return;
      handled.add(r.notification.request.identifier);
      const bagId = r.notification.request.content.data?.bagId;
      if (typeof bagId === 'string') router.push(`/bag/${bagId}`);
    };
    open(Notifications.getLastNotificationResponse());
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);

  const icon = (name: IconName) => ({ color }: { color: unknown }) => <Icon name={name} color={typeof color === 'string' ? color : c.muted} />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.line },
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.ink,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Board',
          tabBarIcon: icon('board'),
          headerRight: () => (
            <Link href="/settings" asChild>
              <Pressable accessibilityLabel="Settings" hitSlop={12} style={{ marginRight: 16 }}>
                <Icon name="settings" color={c.ink} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen name="units" options={{ title: 'Units', tabBarIcon: icon('units') }} />
      <Tabs.Screen
        name="owed"
        options={{ title: 'Owed', tabBarIcon: icon('owed'), tabBarBadge: Math.max(overdue, textsDue) || undefined, tabBarBadgeStyle: { backgroundColor: c.danger } }}
      />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="stock" options={{ title: 'Stock', tabBarIcon: icon('stock') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('history') }} />
    </Tabs>
  );
}
