import { Link } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { useBoard } from '../../lib/board';
import { daysUntil } from '../../lib/format';
import { useColors } from '../../lib/theme';

export default function TabsLayout() {
  const c = useColors();
  const { bags } = useBoard();
  const overdue = bags.filter((b) => b.status === 'taken' && b.due_date && daysUntil(b.due_date) < 0).length;

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
      <Tabs.Screen
        name="owed"
        options={{ title: 'Owed', tabBarIcon: icon('owed'), tabBarBadge: overdue || undefined, tabBarBadgeStyle: { backgroundColor: c.danger } }}
      />
      <Tabs.Screen name="people" options={{ title: 'People', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="stock" options={{ title: 'Stock', tabBarIcon: icon('stock') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('history') }} />
    </Tabs>
  );
}
