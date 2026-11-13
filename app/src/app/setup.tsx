import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Notice, Segmented } from '../components/ui';
import { useBoard } from '../lib/board';
import { supabase } from '../lib/supabase';
import { useColors } from '../lib/theme';

export default function Setup() {
  const c = useColors();
  const { createBoard, joinBoard } = useBoard();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [boardName, setBoardName] = useState('My board');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError('Enter your name so others on the board know who you are.');
    if (mode === 'join' && !code.trim()) return setError('Enter the invite code you were given.');
    setBusy(true);
    try {
      if (mode === 'create') await createBoard(boardName, name);
      else await joinBoard(code, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 26, fontWeight: '800', color: c.ink }}>Set up your board</Text>
          <Text style={{ color: c.muted }}>Start a new board, or join one someone shared with you.</Text>
          <Segmented
            options={[
              { value: 'create', label: 'Start a board' },
              { value: 'join', label: 'Join with code' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
          />
          <Field label="Your name" value={name} onChangeText={setName} placeholder="Shown to others on the board" autoComplete="name" />
          {mode === 'create' ? (
            <Field label="Board name" value={boardName} onChangeText={setBoardName} />
          ) : (
            <Field label="Invite code" value={code} onChangeText={setCode} placeholder="PEG-XXXXXX" autoCapitalize="characters" autoCorrect={false} mono />
          )}
          {error ? <Notice text={error} tone="late" /> : null}
          <Button title={mode === 'create' ? 'Create board' : 'Join board'} variant="primary" busy={busy} onPress={submit} />
          <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
