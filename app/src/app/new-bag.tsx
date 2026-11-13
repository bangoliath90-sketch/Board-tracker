import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, Field, Label, Notice, Page } from '../components/ui';
import { useBoard } from '../lib/board';
import { grams, parseAmount, usd } from '../lib/format';
import { monoFont, useColors } from '../lib/theme';
import { useToast } from '../components/ui';

export default function NewBag() {
  const c = useColors();
  const toast = useToast();
  const { presets, totals, hangBags } = useBoard();
  const start = presets.find((p) => p.grams === 7) ?? presets[0];
  const [g, setG] = useState(start ? String(start.grams) : '');
  const [price, setPrice] = useState(start ? String(start.default_price) : '');
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gNum = parseAmount(g) ?? 0;
  const need = gNum * qty;
  const over = need > totals.available + 1e-9;

  async function hang() {
    setError(null);
    const p = parseAmount(price);
    if (!(gNum > 0)) return setError('Enter how many grams go in the bag.');
    if (p == null || p < 0) return setError('Enter a price.');
    setBusy(true);
    try {
      await hangBags(gNum, p, qty);
      toast(qty > 1 ? `Hung ${qty} bags of ${grams(gNum)}.` : `Hung a ${grams(gNum)} bag.`);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Page>
      <Label>Preset size</Label>
      <View style={styles.chips}>
        {presets.map((p) => (
          <Chip
            key={p.grams}
            label={`${p.grams} g`}
            sub={usd(p.default_price)}
            on={gNum === p.grams}
            style={styles.chip}
            onPress={() => {
              setG(String(p.grams));
              setPrice(String(p.default_price));
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Grams" value={g} onChangeText={setG} keyboardType="decimal-pad" mono />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Price ($)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" mono />
        </View>
      </View>
      <Label>How many bags</Label>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Pressable accessibilityLabel="One fewer" onPress={() => setQty((q) => Math.max(1, q - 1))} style={[styles.step, { borderColor: c.line, backgroundColor: c.surface2 }]}>
          <Text style={{ fontSize: 22, color: c.ink }}>−</Text>
        </Pressable>
        <TextInput
          value={String(qty)}
          onChangeText={(v) => setQty(Math.min(50, Math.max(1, parseInt(v, 10) || 1)))}
          keyboardType="number-pad"
          accessibilityLabel="Number of bags"
          style={[styles.qty, { borderColor: c.line, backgroundColor: c.surface2, color: c.ink }]}
        />
        <Pressable accessibilityLabel="One more" onPress={() => setQty((q) => Math.min(50, q + 1))} style={[styles.step, { borderColor: c.line, backgroundColor: c.surface2 }]}>
          <Text style={{ fontSize: 22, color: c.ink }}>+</Text>
        </Pressable>
      </View>
      {over ? (
        <Notice text={`This needs ${grams(need)}, but only ${grams(Math.max(totals.available, 0))} is unbagged. You can still hang it, and your numbers will show the shortfall.`} />
      ) : null}
      {gNum > 28 ? <Notice tone="none" text="Bags over 28 g show as completely full." /> : null}
      {error ? <Notice text={error} tone="late" /> : null}
      <Button
        title={over ? 'Hang anyway' : qty > 1 ? `Hang ${qty} bags` : 'Hang on board'}
        variant={over ? 'warn' : 'primary'}
        busy={busy}
        onPress={hang}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { width: '31.5%' },
  step: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  qty: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, textAlign: 'center', fontSize: 18, fontFamily: monoFont },
});
