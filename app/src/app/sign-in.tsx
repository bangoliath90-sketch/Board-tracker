import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LiquidBag } from '../components/LiquidBag';
import { Button, Field, Notice, Segmented } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useColors } from '../lib/theme';

export default function SignIn() {
  const c = useColors();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'late' | 'ok' } | null>(null);

  async function submit() {
    setMessage(null);
    const e = email.trim();
    if (!e || !password) {
      setMessage({ text: 'Enter your email and a password.', tone: 'late' });
      return;
    }
    if (mode === 'up' && password.length < 6) {
      setMessage({ text: 'Use a password of at least 6 characters.', tone: 'late' });
      return;
    }
    setBusy(true);
    try {
      if (mode === 'in') {
        const { error } = await supabase.auth.signInWithPassword({ email: e, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email: e, password });
        if (error) throw error;
        if (!data.session) {
          setMode('in');
          setMessage({ text: 'Account created. Check your email for a confirmation link, then sign in here.', tone: 'ok' });
        }
      }
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : 'Something went wrong. Try again.', tone: 'late' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <LiquidBag grams={18} width={84} />
            <Text style={{ fontSize: 30, fontWeight: '800', color: c.ink }}>Pegboard</Text>
            <Text style={{ color: c.muted, textAlign: 'center' }}>Track your inventory, who has it, and who owes you.</Text>
          </View>
          <Segmented
            options={[
              { value: 'in', label: 'Sign in' },
              { value: 'up', label: 'Create account' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setMessage(null);
            }}
          />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            textContentType={mode === 'in' ? 'password' : 'newPassword'}
            onSubmitEditing={submit}
          />
          {message ? <Notice text={message.text} tone={message.tone} /> : null}
          <Button title={mode === 'in' ? 'Sign in' : 'Create account'} variant="primary" busy={busy} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
