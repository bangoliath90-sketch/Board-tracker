import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Field, Label, Notice, Page, useText, useToast } from '../components/ui';
import { useBoard } from '../lib/board';
import { parseAmount, usd } from '../lib/format';
import { monoFont, useColors } from '../lib/theme';
import { DEFAULT_UNIT_CAPACITY, DEFAULT_UNIT_PRICE } from '../lib/units';

export default function AddUnits() {
  const c = useColors();
  const t = useText();
  const toast = useToast();
  const { board, bags, addUnits } = useBoard();
  const capacity = board?.unit_capacity ?? DEFAULT_UNIT_CAPACITY;
  const inBox = bags.filter((b) => b.item === 'unit' && b.status === 'on_board').length;
  const space = Math.max(0, capacity - inBox);

  const [count, setCount] = useState(Math.max(1, space));
  const [price, setPrice] = useState(String(board?.unit_price ?? DEFAULT_UNIT_PRICE));
  const [cost, setCost] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(Math.max(1, space), Math.max(1, n));

  async function save() {
    setError(null);
    if (space === 0) return setError(`The box is full (${capacity} units).`);
    if (count < 1 || count > space) return setError(`You can add 1 to ${space} units.`);
    const p = parseAmount(price);
    if (p == null || p < 0) return setError('Enter the price per unit.');
    const paid = parseAmount(cost);
    if (cost.trim() && (paid == null || paid < 0)) return setError('Enter what you paid as a number, or leave it blank.');
    setBusy(true);
    try {
      await addUnits(count, p, paid, note);
      toast(`Added ${count} unit${count === 1 ? '' : 's'} to the box.`);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Page>
      <Text style={t.muted}>
        {space === 0
          ? `The box is full: ${inBox} of ${capacity} units.`
          : `${inBox} of ${capacity} in the box. There's room for ${space} more.`}
      </Text>
      <Label>How many units</Label>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable accessibilityLabel="One fewer" onPress={() => setCount((n) => clamp(n - 1))} style={[styles.step, { borderColor: c.line, backgroundColor: c.surface2 }]}>
          <Text style={{ fontSize: 22, color: c.ink }}>−</Text>
        </Pressable>
        <TextInput
          value={String(count)}
          onChangeText={(v) => setCount(clamp(parseInt(v, 10) || 1))}
          keyboardType="number-pad"
          accessibilityLabel="Number of units"
          style={[styles.qty, { borderColor: c.line, backgroundColor: c.surface2, color: c.ink }]}
        />
        <Pressable accessibilityLabel="One more" onPress={() => setCount((n) => clamp(n + 1))} style={[styles.step, { borderColor: c.line, backgroundColor: c.surface2 }]}>
          <Text style={{ fontSize: 22, color: c.ink }}>+</Text>
        </Pressable>
      </View>
      {space > 0 && count !== space ? <Button title={`Fill the box (${space})`} onPress={() => setCount(space)} /> : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Price each ($)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" mono />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="You paid, total ($)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="Optional" mono />
        </View>
      </View>
      <Field label="Note" value={note} onChangeText={setNote} placeholder="Optional" />
      {parseAmount(price) != null && space > 0 ? (
        <Text style={t.muted}>
          Box value after adding: {usd((parseAmount(price) ?? 0) * count + bags.filter((b) => b.item === 'unit' && b.status === 'on_board').reduce((s, b) => s + b.price, 0))}
        </Text>
      ) : null}
      {error ? <Notice text={error} tone="late" /> : null}
      <Button title={`Add ${count} unit${count === 1 ? '' : 's'}`} variant="primary" busy={busy} onPress={save} disabled={space === 0} />
    </Page>
  );
}

const styles = StyleSheet.create({
  step: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qty: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, textAlign: 'center', fontSize: 18, fontFamily: monoFont },
});
