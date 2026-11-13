import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidBag } from '../components/LiquidBag';
import { Button, Field, Notice, useToast } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useColors } from '../lib/theme';

/** Read sign-in details Supabase adds to the reset link, in the #fragment or the ?query. */
function readLink(url: string) {
  const params = new URLSearchParams();
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  for (const part of [query, hash]) new URLSearchParams(part).forEach((v, k) => params.set(k, v));
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    code: params.get('code'),
    error: params.get('error_description') ?? params.get('error'),
  };
}

/** Opened from the "Reset password" link in the email. */
export default function ResetPassword() {
  const c = useColors();
  const toast = useToast();
  const url = Linking.useURL();
  const [state, setState] = useState<'checking' | 'ready' | 'failed'>('checking');
  const [problem, setProblem] = useState<string | null>(null);
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handled = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!url) {
        // Opened without a link: fine if already signed in.
        const { data } = await supabase.auth.getSession();
        if (data.session) setState('ready');
        else {
          setProblem('Open the "Reset password" link from your email on this phone.');
          setState('failed');
        }
        return;
      }
      if (handled.current === url) return;
      handled.current = url;
      const link = readLink(url);
      try {
        if (link.error) throw new Error(link.error.replace(/\+/g, ' '));
        if (link.accessToken && link.refreshToken) {
          const { error: e } = await supabase.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
          if (e) throw e;
        } else if (link.code) {
          const { error: e } = await supabase.auth.exchangeCodeForSession(link.code);
          if (e) throw e;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error('This link is missing its sign-in details.');
        }
        setState('ready');
      } catch (e) {
        setProblem(
          `${e instanceof Error ? e.message : 'This link did not work.'} Reset links expire after about an hour and work once. Request a new one from the sign-in screen.`,
        );
        setState('failed');
      }
    })();
  }, [url]);

  async function save() {
    setError(null);
    if (pw.length < 6) return setError('Use at least 6 characters.');
    if (pw !== confirm) return setError('The two passwords don\'t match.');
    setBusy(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password: pw });
      if (e) throw e;
      toast('Password changed. You\'re signed in.');
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change it. Try again.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 8 }}>
            <LiquidBag grams={18} width={84} />
            <Text style={{ fontSize: 26, fontWeight: '800', color: c.ink }}>Choose a new password</Text>
          </View>
          {state === 'checking' ? (
            <ActivityIndicator color={c.accent} />
          ) : state === 'failed' ? (
            <>
              <Notice text={problem ?? 'This link did not work.'} tone="late" />
              <Button title="Back to sign in" variant="primary" onPress={() => router.replace('/')} />
            </>
          ) : (
            <>
              <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
              <Field label="New password again" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={save} />
              {error ? <Notice text={error} tone="late" /> : null}
              <Button title="Save new password" variant="primary" busy={busy} onPress={save} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
