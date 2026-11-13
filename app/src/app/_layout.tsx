import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Button, ToastProvider } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';
import { BoardProvider, useBoard } from '../lib/board';
import { LockProvider } from '../lib/lock';
import { supabase } from '../lib/supabase';
import { useColors } from '../lib/theme';
import { useAutoUpdate } from '../lib/updates';

export default function RootLayout() {
  useAutoUpdate();
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <BoardProvider>
          <ToastProvider>
            <LockProvider>
              <Navigation />
            </LockProvider>
          </ToastProvider>
        </BoardProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Navigation() {
  const scheme = useColorScheme();
  const c = useColors();
  const { session, loading } = useAuth();
  const { status, error, reload } = useBoard();

  if (loading || (session && status === 'loading')) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (session && status === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: c.bg }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>Couldn't load your board</Text>
        <Text style={{ color: c.muted }}>{error ?? 'Check your internet connection and try again.'}</Text>
        <Button title="Try again" variant="primary" onPress={reload} />
        <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
      </View>
    );
  }

  const signedIn = !!session;
  const hasBoard = status === 'ready';

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.surface },
          headerTintColor: c.ink,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasBoard}>
          <Stack.Screen name="setup" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && hasBoard}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="new-bag" options={{ presentation: 'modal', title: 'New bag' }} />
          <Stack.Screen name="bag/[id]" options={{ presentation: 'modal', title: 'Bag' }} />
          <Stack.Screen name="person/[id]" options={{ title: 'Person' }} />
          <Stack.Screen name="stock-entry" options={{ presentation: 'modal', title: 'Inventory' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="edit-bag/[id]" options={{ presentation: 'modal', title: 'Edit bag' }} />
          <Stack.Screen name="profit" options={{ title: 'Profit' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
