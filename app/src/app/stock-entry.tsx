import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Field, Label, Notice, Page, Segmented, useText, useToast } from '../components/ui';
import { useBoard } from '../lib/board';
import { grams, isoDate, parseAmount } from '../lib/format';

/** Add a restock or adjustment, or (with ?id=) fix or delete an existing entry. */
export default function StockEntry() {
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const t = useText();
  const toast = useToast();
  const { addStock, updateStock, deleteStock, stock, totals } = useBoard();
  const existing = params.id ? stock.find((s) => s.id === params.id) : undefined;
  const kind: 'restock' | 'adjust' = existing?.kind ?? (params.kind === 'adjust' ? 'adjust' : 'restock');

  const [dir, setDir] = useState<'add' | 'remove'>(existing ? (existing.grams >= 0 ? 'add' : 'remove') : 'remove');
  const [g, setG] = useState(existing ? String(Math.abs(existing.grams)) : '');
  const [cost, setCost] = useState(existing?.cost != null ? String(existing.cost) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [date, setDate] = useState(existing?.entry_date ?? isoDate(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (params.id && !existing) {
    return (
      <Page>
        <Text style={t.muted}>This entry was deleted.</Text>
      </Page>
    );
  }

  async function save() {
    setError(null);
    const amount = parseAmount(g);
    if (amount == null || amount <= 0) return setError('Enter the number of grams.');
    const c = parseAmount(cost);
    if (cost.trim() && (c == null || c < 0)) return setError('Enter what you paid as a number, or leave it blank.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Enter the date as YYYY-MM-DD.');
    const signed = kind === 'restock' || dir === 'add' ? amount : -amount;
    const paid = kind === 'restock' ? c : null;
    setBusy(true);
    try {
      if (existing) {
        await updateStock(existing.id, { grams: signed, cost: paid, note, date });
        toast('Entry updated.');
      } else {
        await addStock({ kind, grams: signed, cost: paid, note, date });
        toast(`${signed >= 0 ? 'Added' : 'Removed'} ${grams(Math.abs(signed))}. On hand is now ${grams(totals.onHand + signed)}.`);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
  }

  const confirmDelete = () =>
    Alert.alert('Delete this entry?', `Your on-hand total changes by ${grams(Math.abs(existing!.grams))}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteStock(existing!.id);
            toast('Entry deleted.');
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not delete. Try again.');
          }
        },
      },
    ]);

  const title = existing ? (kind === 'restock' ? 'Edit restock' : 'Edit adjustment') : kind === 'restock' ? 'Add restock' : 'Adjust inventory';

  return (
    <Page>
      <Stack.Screen options={{ title }} />
      {!existing ? (
        <Text style={t.muted}>
          {kind === 'restock'
            ? 'Add grams you received. Use this for your starting total too. Enter what you paid to see profit.'
            : 'Fix your total after a scale correction, a loss, or a recount.'}
        </Text>
      ) : null}
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
      <Field label="Grams" value={g} onChangeText={setG} keyboardType="decimal-pad" mono autoFocus={!existing} />
      {kind === 'restock' ? <Field label="You paid ($)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="Optional" mono /> : null}
      <Field label={kind === 'restock' ? 'Note' : 'Reason'} value={note} onChangeText={setNote} placeholder={kind === 'restock' ? 'Optional' : 'e.g. scale correction'} />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} mono autoCorrect={false} />
      {error ? <Notice text={error} tone="late" /> : null}
      <Button title={existing ? 'Save changes' : kind === 'restock' ? 'Add to inventory' : 'Save adjustment'} variant="primary" busy={busy} onPress={save} />
      {existing ? <Button title="Delete entry" variant="danger" onPress={confirmDelete} /> : null}
    </Page>
  );
}
