import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Field, Label, Notice, Page, Segmented, useText, useToast } from '../components/ui';
import { useBoard } from '../lib/board';
import { grams, isoDate, parseAmount } from '../lib/format';

export default function StockEntry() {
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const kind: 'restock' | 'adjust' = kindParam === 'adjust' ? 'adjust' : 'restock';
  const t = useText();
  const toast = useToast();
  const { addStock, totals } = useBoard();
  const [dir, setDir] = useState<'add' | 'remove'>('remove');
  const [g, setG] = useState('');
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    const amount = parseAmount(g);
    if (amount == null || amount <= 0) return setError('Enter the number of grams.');
    const c = parseAmount(cost);
    if (cost.trim() && (c == null || c < 0)) return setError('Enter what you paid as a number, or leave it blank.');
    const signed = kind === 'restock' || dir === 'add' ? amount : -amount;
    setBusy(true);
    try {
      await addStock({ kind, grams: signed, cost: kind === 'restock' ? c : null, note, date: isoDate(new Date()) });
      toast(`${signed >= 0 ? 'Added' : 'Removed'} ${grams(Math.abs(signed))}. On hand is now ${grams(totals.onHand + signed)}.`);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Page>
      <Stack.Screen options={{ title: kind === 'restock' ? 'Add restock' : 'Adjust inventory' }} />
      <Text style={t.muted}>
        {kind === 'restock'
          ? 'Add grams you received. Use this for your starting total too.'
          : 'Fix your total after a scale correction, a loss, or a recount.'}
      </Text>
      {kind === 'adjust' ? (
        <View style={{ gap: 8 }}>
          <Label>Direction</Label>
          <Segmented
            options={[
              { value: 'add', label: 'Add grams' },
              { value: 'remove', label: 'Remove grams' },
            ]}
            value={dir}
            onChange={setDir}
          />
        </View>
      ) : null}
      <Field label="Grams" value={g} onChangeText={setG} keyboardType="decimal-pad" mono autoFocus />
      {kind === 'restock' ? <Field label="You paid ($)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="Optional" mono /> : null}
      <Field label={kind === 'restock' ? 'Note' : 'Reason'} value={note} onChangeText={setNote} placeholder={kind === 'restock' ? 'Optional' : 'e.g. scale correction'} />
      {error ? <Notice text={error} tone="late" /> : null}
      <Button title={kind === 'restock' ? 'Add to inventory' : 'Save adjustment'} variant="primary" busy={busy} onPress={save} />
    </Page>
  );
}
