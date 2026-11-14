import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Field, Label, Notice, Page, Pill, Row, useText, useToast } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { pickContact } from '../../lib/contacts';
import { dueInfo, itemLabel, shortDate, usd } from '../../lib/format';
import { useColors } from '../../lib/theme';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const c = useColors();
  const t = useText();
  const toast = useToast();
  const { people, bags, addPerson, updatePerson, deletePerson } = useBoard();
  const person = people.find((p) => p.id === id);
  const [name, setName] = useState(person?.name ?? '');
  const [phone, setPhone] = useState(person?.phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mine = bags
    .filter((b) => b.person_id === id && b.status !== 'on_board')
    .sort((a, b) => (b.taken_at ?? '').localeCompare(a.taken_at ?? ''));
  const owe = mine.filter((b) => b.status === 'taken').reduce((s, b) => s + b.price, 0);
  const paid = mine.filter((b) => b.status === 'paid').reduce((s, b) => s + b.price, 0);

  async function save() {
    const n = name.trim();
    setError(null);
    if (!n) return setError('Enter a name.');
    if (people.some((p) => p.id !== id && p.name.toLowerCase() === n.toLowerCase())) return setError(`${n} is already on your list.`);
    setBusy(true);
    try {
      if (isNew) {
        await addPerson(n, phone);
        toast(`Added ${n}.`);
        router.back();
      } else {
        await updatePerson(id, { name: n, phone });
        toast('Saved.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function fromContacts() {
    setError(null);
    try {
      const picked = await pickContact();
      if (!picked) return;
      if (isNew || !name.trim()) setName(picked.name);
      if (picked.phone) setPhone(picked.phone);
      else setError(`${picked.name} has no phone number in your contacts.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your contacts.');
    }
  }

  if (!isNew && !person) {
    return (
      <Page>
        <Text style={t.muted}>This person is no longer on the board.</Text>
      </Page>
    );
  }

  return (
    <Page>
      <Stack.Screen options={{ title: isNew ? 'Add person' : person!.name }} />
      {!isNew ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Card style={{ flex: 1, padding: 12 }}>
            <Label>Owes</Label>
            <Text style={[t.mono, { fontSize: 20, color: owe ? c.danger : c.ink }]}>{usd(owe)}</Text>
          </Card>
          <Card style={{ flex: 1, padding: 12 }}>
            <Label>Paid so far</Label>
            <Text style={[t.mono, { fontSize: 20, color: c.ok }]}>{usd(paid)}</Text>
          </Card>
        </View>
      ) : null}
      <Button title="Pick from contacts" onPress={fromContacts} />
      <Field label="Name" value={name} onChangeText={setName} />
      <Field label="Phone (for text reminders)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="Optional" />
      {error ? <Notice text={error} tone="late" /> : null}
      <Button title={isNew ? 'Add person' : 'Save'} variant="primary" busy={busy} onPress={save} />
      {!isNew && mine.length === 0 ? (
        <Button
          title="Delete person"
          variant="danger"
          onPress={() =>
            Alert.alert(`Delete ${person!.name}?`, 'They will be removed from your people list.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await deletePerson(id);
                    toast(`Deleted ${person!.name}.`);
                    router.back();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Could not delete. Try again.');
                  }
                },
              },
            ])
          }
        />
      ) : null}
      {!isNew ? (
        <>
          <Label>Bags</Label>
          <Card>
            {mine.length === 0 ? (
              <Text style={[t.muted, { padding: 20, textAlign: 'center' }]}>No bags yet.</Text>
            ) : (
              mine.map((b, i) => {
                const d = dueInfo(b);
                return (
                  <Row key={b.id} last={i === mine.length - 1} onPress={() => router.push(`/bag/${b.id}`)}>
                    <View style={{ flex: 1 }}>
                      <Text style={t.mono}>{itemLabel(b)}</Text>
                      <Text style={t.muted}>taken {b.taken_at ? shortDate(b.taken_at) : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={t.mono}>{usd(b.price)}</Text>
                      {b.status === 'paid' ? <Pill text="Paid" tone="ok" /> : <Pill text={d.label} tone={d.tone === 'none' ? 'none' : d.tone} />}
                    </View>
                  </Row>
                );
              })
            )}
          </Card>
        </>
      ) : null}
    </Page>
  );
}
