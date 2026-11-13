import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chip, Field, Label, Notice, Page, useText, useToast } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { grams, parseAmount, usd } from '../../lib/format';

export default function EditBag() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useText();
  const toast = useToast();
  const { bags, people, updateBag } = useBoard();
  const bag = bags.find((b) => b.id === id);
  const [g, setG] = useState(bag ? String(bag.grams) : '');
  const [price, setPrice] = useState(bag ? String(bag.price) : '');
  const [personId, setPersonId] = useState(bag?.person_id ?? null);
  const [notes, setNotes] = useState(bag?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!bag) {
    return (
      <Page>
        <Text style={t.muted}>This bag was removed.</Text>
      </Page>
    );
  }
  const taken = bag.status !== 'on_board';

  async function save() {
    setError(null);
    const gr = parseAmount(g);
    const pr = parseAmount(price);
    if (gr == null || gr <= 0) return setError('Enter how many grams are in the bag.');
    if (pr == null || pr < 0) return setError('Enter the price.');
    setBusy(true);
    try {
      await updateBag(bag!.id, { grams: gr, price: pr, personId: taken ? personId ?? undefined : undefined, notes });
      toast(`Saved: ${grams(gr)} for ${usd(pr)}.`);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Page>
      {taken ? (
        <Text style={t.muted}>Changing the grams of a taken bag also changes your on-hand total.</Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Grams" value={g} onChangeText={setG} keyboardType="decimal-pad" mono />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Price ($)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" mono />
        </View>
      </View>
      {taken ? (
        <>
          <Label>Taken by</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {people.map((p) => (
              <Chip key={p.id} label={p.name} on={personId === p.id} onPress={() => setPersonId(p.id)} />
            ))}
          </View>
        </>
      ) : null}
      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
      {error ? <Notice text={error} tone="late" /> : null}
      <Button title="Save changes" variant="primary" busy={busy} onPress={save} />
    </Page>
  );
}
