import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidBag } from '../components/LiquidBag';
import { Button } from '../components/ui';
import { useAuth } from './auth';
import { supabase } from './supabase';
import { useColors } from './theme';

const STORAGE_KEY = 'app-lock-enabled';
/** Leaving the app for less than this (e.g. to send a text) doesn't relock it. */
const GRACE_MS = 60_000;

type LockState = {
  /** The phone has Face ID, a fingerprint or a passcode set up. */
  available: boolean;
  enabled: boolean;
  method: string;
  setEnabled: (on: boolean) => Promise<boolean>;
};

const LockContext = createContext<LockState>({ available: false, enabled: false, method: 'Face ID', setEnabled: async () => false });
export const useLock = () => useContext(LockContext);

function methodName(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
  return 'passcode';
}

export function LockProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabledState] = useState(true);
  const [method, setMethod] = useState('Face ID');
  const [locked, setLocked] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prompting = useRef(false);
  const leftAt = useRef<number | null>(null);
  const shouldLock = useRef(true);

  const authenticate = useCallback(async (message = 'Unlock Board Tracker') => {
    if (prompting.current) return false;
    prompting.current = true;
    setError(null);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: message,
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (!result.success && result.error !== 'user_cancel' && result.error !== 'app_cancel' && result.error !== 'system_cancel') {
        setError('That didn\'t work. Try again.');
      }
      return result.success;
    } catch {
      setError('Could not check your identity. Try again.');
      return false;
    } finally {
      prompting.current = false;
    }
  }, []);

  const unlock = useCallback(async () => {
    if (await authenticate()) setLocked(false);
  }, [authenticate]);

  // Read the saved setting and what this phone supports.
  useEffect(() => {
    (async () => {
      let on = true;
      try {
        on = (await AsyncStorage.getItem(STORAGE_KEY)) !== 'off';
      } catch {}
      let canLock = false;
      try {
        const level = await LocalAuthentication.getEnrolledLevelAsync();
        canLock = level !== LocalAuthentication.SecurityLevel.NONE;
        setMethod(methodName(await LocalAuthentication.supportedAuthenticationTypesAsync()));
      } catch {}
      setEnabledState(on);
      setAvailable(canLock);
      shouldLock.current = on && canLock;
      setLocked(on && canLock);
      setReady(true);
    })();
  }, []);

  // Someone who just signed in with their password doesn't need Face ID as well.
  const sawSignedOut = useRef(false);
  useEffect(() => {
    if (authLoading) return;
    if (!session) sawSignedOut.current = true;
    else if (sawSignedOut.current) {
      sawSignedOut.current = false;
      setLocked(false);
    }
  }, [authLoading, session]);

  // Ask right away whenever the lock appears for a signed-in user.
  useEffect(() => {
    if (ready && locked && session) unlock();
  }, [ready, locked, session, unlock]);

  // Relock after the app has been in the background for a while.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') leftAt.current = Date.now();
      if (state === 'active' && leftAt.current != null) {
        const away = Date.now() - leftAt.current;
        leftAt.current = null;
        if (away >= GRACE_MS && shouldLock.current) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const setEnabled = useCallback(
    async (on: boolean) => {
      // Confirm it's really the phone's owner before changing the lock either way.
      const ok = await authenticate(on ? 'Turn on the app lock' : 'Turn off the app lock');
      if (!ok) return false;
      try {
        await AsyncStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
      } catch {}
      setEnabledState(on);
      shouldLock.current = on && available;
      return true;
    },
    [authenticate, available],
  );

  const showLock = !!session && (!ready || locked);

  return (
    <LockContext.Provider value={{ available, enabled, method, setEnabled }}>
      {children}
      {showLock ? <LockScreen ready={ready} method={method} error={error} onUnlock={unlock} /> : null}
    </LockContext.Provider>
  );
}

function LockScreen({ ready, method, error, onUnlock }: { ready: boolean; method: string; error: string | null; onUnlock: () => void }) {
  const c = useColors();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]} accessibilityViewIsModal>
      <SafeAreaView style={styles.wrap}>
        <LiquidBag grams={18} width={84} />
        <Text style={[styles.title, { color: c.ink }]}>Board Tracker is locked</Text>
        {ready ? (
          <>
            <Text style={{ color: c.muted, textAlign: 'center' }}>Unlock with {method} to see your board.</Text>
            {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
            <Button title={`Unlock with ${method}`} variant="primary" onPress={onUnlock} style={{ alignSelf: 'stretch' }} />
            <Button title="Sign out instead" onPress={() => supabase.auth.signOut()} style={{ alignSelf: 'stretch' }} />
          </>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  title: { fontSize: 24, fontWeight: '800' },
});
