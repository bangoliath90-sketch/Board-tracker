import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Alert, Share, Text, View } from 'react-native';
import { Button, Card, Field, Label, Notice, Page, Pill, Row, useText, useToast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useBoard } from '../lib/board';
import { parseAmount } from '../lib/format';
import { supabase } from '../lib/supabase';
import { monoFont, useColors } from '../lib/theme';

export default function Settings() {
  const c = useColors();
  const t = useText();
  const toast = useToast();
  const { session } = useAuth();
  const { board, members, presets, savePresets, leaveBoard } = useBoard();
  const [prices, setPrices] = useState<Record<number, string>>(() =>
    Object.fromEntries(presets.map((p) => [p.grams, String(p.default_price)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const next = [];
    for (const p of presets) {
      const v = parseAmount(prices[p.grams] ?? '');
      if (v == null || v < 0) return setError(`Enter a price for ${p.grams} g.`);
      next.push({ grams: p.grams, default_price: v });
    }
    setBusy(true);
    try {
      await savePresets(next);
      toast('Preset prices saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const code = board?.invite_code ?? '';

  return (
    <Page>
      <Label>Preset prices</Label>
      <Text style={t.muted}>These fill in automatically when you pick a size. You can still change the price on any bag.</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {presets.map((p) => (
          <View key={p.grams} style={{ width: '47%' }}>
            <Field
              label={`${p.grams} g ($)`}
              value={prices[p.grams] ?? ''}
              onChangeText={(v) => setPrices((s) => ({ ...s, [p.grams]: v }))}
              keyboardType="decimal-pad"
              mono
            />
          </View>
        ))}
      </View>
      {error ? <Notice text={error} tone="late" /> : null}
      <Button title="Save prices" variant="primary" busy={busy} onPress={save} />

      <Label>Invite code</Label>
      <Card style={{ padding: 14, alignItems: 'center' }}>
        <Text selectable style={{ fontFamily: monoFont, fontWeight: '700', fontSize: 24, letterSpacing: 2, color: c.ink }}>
          {code}
        </Text>
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button
          title="Copy"
          style={{ flex: 1 }}
          onPress={async () => {
            await Clipboard.setStringAsync(code);
            toast('Invite code copied.');
          }}
        />
        <Button
          title="Share"
          style={{ flex: 1 }}
          onPress={() => Share.share({ message: `Join my board in the Pegboard app with invite code ${code}` })}
        />
      </View>
      <Text style={t.muted}>Anyone who enters this code joins your board, and everyone has equal access.</Text>

      <Label>Members</Label>
      <Card>
        {members.map((m, i) => (
          <Row key={m.user_id} last={i === members.length - 1}>
            <Text style={[t.strong, { flex: 1 }]}>
              {m.display_name}
              {m.user_id === session?.user.id ? <Text style={t.muted}> (you)</Text> : null}
            </Text>
            <Pill text="Full access" />
          </Row>
        ))}
      </Card>

      <Label>Account</Label>
      <Text style={t.muted}>Signed in as {session?.user.email}</Text>
      <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
      <Button
        title="Leave this board"
        variant="danger"
        onPress={() =>
          Alert.alert('Leave this board?', 'You will stop seeing it on this account. You can rejoin later with the invite code.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: () => leaveBoard().catch((e) => setError(String(e?.message ?? e))) },
          ])
        }
      />
    </Page>
  );
}
