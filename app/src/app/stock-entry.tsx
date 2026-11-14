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
  const kind: 'restock' | 'adjust' | 'loss' =
    existing?.kind ?? (params.kind === 'adjust' ? 'adjust' : params.kind === 'loss' ? 'loss' : 'restock');
  const unitEntry = existing?.item === 'unit';
  const amountLabel = unitEntry ? (kind === 'loss' ? 'Units lost' : 'Units') : kind === 'loss' ? 'Grams lost' : 'Grams';

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
    if (amount == null || amount <= 0) return setError(unitEntry ? 'Enter the number of units.' : 'Enter the number of grams.');
    const c = parseAmount(cost);
    if (cost.trim() && (c == null || c < 0)) return setError('Enter what you paid as a number, or leave it blank.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError('Enter the date as YYYY-MM-DD.');
    const signed = kind === 'restock' || (kind === 'adjust' && dir === 'add') ? amount : -amount;
    const paid = kind === 'restock' ? c : null;
    setBusy(true);
    try {
      if (existing) {
        await updateStock(existing.id, { grams: signed, cost: paid, note, date });
        toast(kind === 'loss' ? 'Loss updated.' : 'Entry updated.');
      } else {
        await addStock({ kind, grams: signed, cost: paid, note, date });
        toast(
          kind === 'loss'
            ? `Recorded a loss of ${grams(amount)}. On hand is now ${grams(totals.onHand + signed)}.`
            : `${signed >= 0 ? 'Added' : 'Removed'} ${grams(Math.abs(signed))}. On hand is now ${grams(totals.onHand + signed)}.`,
        );
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
  }

  const confirmDelete = () =>
    Alert.alert(
      'Delete this entry?',
      unitEntry
        ? 'This only removes the record. It does not put units back in the box.'
        : `Your on-hand total changes by ${grams(Math.abs(existing!.grams))}.`,
      [
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
      ],
    );

  const title = existing
    ? { restock: 'Edit restock', adjust: 'Edit adjustment', loss: 'Edit loss' }[kind]
    : { restock: 'Add restock', adjust: 'Adjust inventory', loss: 'Record loss' }[kind];

  return (
    <Page>
      <Stack.Screen options={{ title }} />
      {!existing ? (
        <Text style={t.muted}>
          {kind === 'restock'
            ? 'Add grams you received. Use this for your starting total too. Enter what you paid to see profit.'
            : kind === 'loss'
              ? 'Record grams lost from your unbagged stock: a spill, damage, or anything you can\'t sell. It comes off your on-hand total and counts against profit.'
              : 'Fix your total after a scale correction or a recount. Use Record loss for product you lost.'}
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
      <Field label={amountLabel} value={g} onChangeText={setG} keyboardType="decimal-pad" mono autoFocus={!existing} />
      {kind === 'restock' ? <Field label="You paid ($)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="Optional" mono /> : null}
      <Field
        label={kind === 'restock' ? 'Note' : 'Reason'}
        value={note}
        onChangeText={setNote}
        placeholder={kind === 'restock' ? 'Optional' : kind === 'loss' ? 'e.g. spilled, damaged' : 'e.g. scale correction'}
      />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} mono autoCorrect={false} />
      {error ? <Notice text={error} tone="late" /> : null}
      <Button
        title={existing ? 'Save changes' : { restock: 'Add to inventory', adjust: 'Save adjustment', loss: 'Record loss' }[kind]}
        variant="primary"
        busy={busy}
        onPress={save}
      />
      {existing ? <Button title="Delete entry" variant="danger" onPress={confirmDelete} /> : null}
    </Page>
  );
}
