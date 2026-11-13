import * as Linking from 'expo-linking';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidBag } from '../components/LiquidBag';
import { Button, Field, Notice, Segmented, useToast } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useColors } from '../lib/theme';

type Mode = 'in' | 'up' | 'forgot' | 'code';
type Message = { text: string; tone: 'late' | 'ok' } | null;

export default function SignIn() {
  const c = useColors();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const go = (m: Mode, msg: Message = null) => {
    setMode(m);
    setMessage(msg);
  };

  async function attempt(fn: () => Promise<void>) {
    setMessage(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Something went wrong. Try again.', tone: 'late' });
    } finally {
      setBusy(false);
    }
  }

  const signInOrUp = () => {
    const e = email.trim();
    if (!e || !password) return setMessage({ text: 'Enter your email and a password.', tone: 'late' });
    if (mode === 'up' && password.length < 6) return setMessage({ text: 'Use a password of at least 6 characters.', tone: 'late' });
    attempt(async () => {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: e, password });
        if (error) throw error;
        if (!data.session) go('in', { text: 'Account created. Check your email for a confirmation link, then sign in here.', tone: 'ok' });
      }
    });
  };

  const sendCode = () => {
    const e = email.trim();
    if (!e) return setMessage({ text: 'Enter the email you signed up with.', tone: 'late' });
    attempt(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo: Linking.createURL('reset-password') });
      if (error) throw error;
      go('code', {
        text: `If ${e} has an account, an email is on its way (check spam too). Tap its "Reset password" link on this phone, or type the code below if the email has one.`,
        tone: 'ok',
      });
    });
  };

  const resetPassword = () => {
    const e = email.trim();
    const token = code.replace(/\s/g, '');
    if (!/^\d{6,10}$/.test(token)) return setMessage({ text: 'Enter the code from the email.', tone: 'late' });
    if (newPassword.length < 6) return setMessage({ text: 'Use a new password of at least 6 characters.', tone: 'late' });
    if (newPassword !== confirm) return setMessage({ text: 'The two passwords don\'t match.', tone: 'late' });
    attempt(async () => {
      const { error } = await supabase.auth.verifyOtp({ email: e, token, type: 'recovery' });
      if (error) throw new Error('That code didn\'t work. It may have expired. Send a new one and try again.');
      // The code signs you in; now save the new password on the account.
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      toast('Password changed. You\'re signed in.');
    });
  };

  const isAuth = mode === 'in' || mode === 'up';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <LiquidBag grams={18} width={84} />
            <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink }}>Pegboard</Text>
            <Text style={{ color: c.muted, textAlign: 'center' }}>
              {isAuth ? 'Track your inventory, who has it, and who owes you.' : 'Reset your password'}
            </Text>
          </View>

          {isAuth ? (
            <>
              <Segmented
                options={[
                  { value: 'in', label: 'Sign in' },
                  { value: 'up', label: 'Create account' },
                ]}
                value={mode as 'in' | 'up'}
                onChange={(m) => go(m)}
              />
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
              <Field
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                textContentType={mode === 'in' ? 'password' : 'newPassword'}
                onSubmitEditing={signInOrUp}
              />
              {message ? <Notice text={message.text} tone={message.tone} /> : null}
              <Button title={mode === 'in' ? 'Sign in' : 'Create account'} variant="primary" busy={busy} onPress={signInOrUp} />
              {mode === 'in' ? <LinkText text="Forgot password?" onPress={() => go('forgot')} /> : null}
            </>
          ) : mode === 'forgot' ? (
            <>
              <Text style={{ color: c.muted }}>Enter your email and we'll send you a code to set a new password.</Text>
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" onSubmitEditing={sendCode} />
              {message ? <Notice text={message.text} tone={message.tone} /> : null}
              <Button title="Send code" variant="primary" busy={busy} onPress={sendCode} />
              <LinkText text="I already have a code" onPress={() => go('code')} />
              <LinkText text="Back to sign in" onPress={() => go('in')} />
            </>
          ) : (
            <>
              <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Field label="Code from the email" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" mono />
              <Field label="New password" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
              <Field label="New password again" value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={resetPassword} />
              {message ? <Notice text={message.text} tone={message.tone} /> : null}
              <Button title="Set new password" variant="primary" busy={busy} onPress={resetPassword} />
              <LinkText text="Send a new code" onPress={() => go('forgot')} />
              <LinkText text="Back to sign in" onPress={() => go('in')} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function LinkText({ text, onPress }: { text: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 4 }}>
      <Text style={{ color: c.accent, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );
}
