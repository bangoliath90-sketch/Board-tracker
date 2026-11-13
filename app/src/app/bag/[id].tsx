import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { DateField } from '../../components/DateField';
import { LiquidBag } from '../../components/LiquidBag';
import { Pegboard } from '../../components/Pegboard';
import { Button, Chip, Field, Label, Notice, Page, Pill, Segmented, useText, useToast } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { pickContact } from '../../lib/contacts';
import { isReminderDue, openTextReminder, reminderDays, reminderMessage, reminderTemplate } from '../../lib/reminders';
import { addDays, dueInfo, grams, parseAmount, shortDate, usd } from '../../lib/format';
import type { Bag } from '../../lib/types';
import { monoFont, useColors } from '../../lib/theme';

export default function BagScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bags } = useBoard();
  const bag = bags.find((b) => b.id === id);
  const t = useText();

  if (!bag) {
    return (
      <Page>
        <Text style={t.muted}>This bag was removed.</Text>
        <Button title="Close" onPress={() => router.back()} />
      </Page>
    );
  }
  if (bag.status === 'on_board') return <TakeForm bag={bag} />;
  if (bag.status === 'taken') return <OwedBag bag={bag} />;
  return <PaidBag bag={bag} />;
}

function Hero({ bag, subtitle }: { bag: Bag; subtitle: string }) {
  return (
    <Pegboard framed={false} style={styles.hero}>
      <LiquidBag grams={bag.grams} width={90} danger={bag.status === 'taken' && dueInfo(bag).tone === 'late'} />
      <View style={styles.heroInfo}>
        <Text style={styles.heroG}>{grams(bag.grams)}</Text>
        <Text style={styles.heroS}>{subtitle}</Text>
      </View>
    </Pegboard>
  );
}

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, setError, run };
}

/* ---------- bag still on the board ---------- */
function TakeForm({ bag }: { bag: Bag }) {
  const c = useColors();
  const toast = useToast();
  const { people, takeBag, removeBag } = useBoard();
  const [personId, setPersonId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(people.length === 0);
  const [price, setPrice] = useState(String(bag.price));
  const [mode, setMode] = useState<'owes' | 'paid'>('owes');
  const [due, setDue] = useState(addDays(7));
  const [notes, setNotes] = useState('');
  const { busy, error, setError, run } = useAction();

  const submit = () => {
    const p = parseAmount(price);
    if (!personId && !newName.trim()) return setError('Choose who grabbed the bag.');
    if (p == null || p < 0) return setError('Enter the price.');
    run(async () => {
      const { personName } = await takeBag(bag.id, {
        personId: adding ? undefined : personId ?? undefined,
        newPersonName: adding ? newName : undefined,
        phone: phone || null,
        price: p,
        paid: mode === 'paid',
        dueDate: mode === 'paid' ? null : due,
        notes,
      });
      toast(
        mode === 'paid'
          ? `${personName} paid ${usd(p)}. ${grams(bag.grams)} came off your stock and the bag moved to History.`
          : `${personName} owes ${usd(p)}. ${grams(bag.grams)} came off your stock and the bag moved to Owed.`,
      );
      router.back();
    });
  };

  const fromContacts = async () => {
    setError(null);
    try {
      const picked = await pickContact();
      if (!picked) return;
      const match = people.find((p) => p.name.toLowerCase() === picked.name.toLowerCase());
      if (match) {
        setAdding(false);
        setPersonId(match.id);
        setNewName('');
      } else {
        setAdding(true);
        setPersonId(null);
        setNewName(picked.name);
      }
      setPhone(picked.phone ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your contacts.');
    }
  };

  const selected = people.find((p) => p.id === personId);

  const confirmRemove = () =>
    Alert.alert('Take this bag off the board?', `The ${grams(bag.grams)} goes back to unbagged stock.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await removeBag(bag.id);
            toast(`Removed the ${grams(bag.grams)} bag.`);
            router.back();
          }),
      },
    ]);

  return (
    <Page>
      <Stack.Screen options={{ title: 'Bag on the board' }} />
      <Hero bag={bag} subtitle={`${usd(bag.price)} · on the board`} />
      <Label>Who grabbed it?</Label>
      <View style={styles.wrap}>
        {people.map((p) => (
          <Chip
            key={p.id}
            label={p.name}
            on={!adding && personId === p.id}
            onPress={() => {
              setAdding(false);
              setPersonId(p.id);
              setError(null);
            }}
          />
        ))}
        <Chip label="+ New person" on={adding} onPress={() => { setAdding(true); setPersonId(null); setPhone(''); }} />
        <Chip label="From contacts" on={false} onPress={fromContacts} />
      </View>
      {adding ? <Field label="New person's name" value={newName} onChangeText={setNewName} /> : null}
      {adding || (selected && !selected.phone) ? (
        <Field label="Phone (for text reminders)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Optional" autoComplete="tel" />
      ) : null}
      <Field label="Price ($)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" mono />
      <Label>Payment</Label>
      <Segmented
        options={[
          { value: 'paid', label: 'Paid now', color: c.ok },
          { value: 'owes', label: 'Owes me', color: c.danger },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'owes' ? <DateField label="Pay by" value={due} onChange={setDue} /> : null}
      <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
      {error ? <Notice text={error} tone="late" /> : null}
      <Button title={`Mark as taken · removes ${grams(bag.grams)} from stock`} variant="primary" busy={busy} onPress={submit} />
      <Button title="Take bag off the board" variant="danger" onPress={confirmRemove} />
    </Page>
  );
}

/* ---------- taken, still owed ---------- */
function OwedBag({ bag }: { bag: Bag }) {
  const t = useText();
  const toast = useToast();
  const { board, people, personName, markPaid, undoTake, setDueDate, markReminded } = useBoard();
  const name = personName(bag.person_id);
  const person = people.find((p) => p.id === bag.person_id);
  const days = reminderDays(board);
  const reminderDue = isReminderDue(bag, days);
  const message = reminderMessage(reminderTemplate(board), bag, name);

  const sendText = () =>
    run(async () => {
      if (!person?.phone) return;
      const sent = await openTextReminder(person.phone, message);
      if (sent) {
        await markReminded(bag.id);
        toast(`Reminder sent to ${name}.`);
      }
    });
  const d = dueInfo(bag);
  const [due, setDue] = useState(bag.due_date ?? addDays(7));
  const { busy, error, run } = useAction();

  const confirmUndo = () =>
    Alert.alert('Undo this take?', `The bag goes back on the board and ${grams(bag.grams)} returns to your stock.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Undo take',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await undoTake(bag.id);
            toast(`Undone. ${grams(bag.grams)} is back on the board.`);
            router.back();
          }),
      },
    ]);

  return (
    <Page>
      <Stack.Screen options={{ title: `${name} owes` }} />
      <Hero bag={bag} subtitle={`${usd(bag.price)} · taken, owes`} />
      <View style={styles.kv}>
        <Text style={t.muted}>Taken</Text>
        <Text style={t.strong}>{bag.taken_at ? shortDate(bag.taken_at) : '—'}</Text>
      </View>
      <View style={styles.kv}>
        <Text style={t.muted}>Amount owed</Text>
        <Text style={t.mono}>{usd(bag.price)}</Text>
      </View>
      <View style={styles.kv}>
        <Text style={t.muted}>Status</Text>
        <Pill text={d.label} tone={d.tone === 'none' ? 'none' : d.tone} />
      </View>
      {bag.notes ? (
        <View style={styles.kv}>
          <Text style={t.muted}>Notes</Text>
          <Text style={[t.body, { flexShrink: 1, textAlign: 'right' }]}>{bag.notes}</Text>
        </View>
      ) : null}
      <DateField
        label="Pay by"
        value={due}
        onChange={(v) => {
          setDue(v);
          run(async () => {
            await setDueDate(bag.id, v);
            toast(`Due date set to ${shortDate(v)}.`);
          });
        }}
      />
      <Label>Text reminder</Label>
      {person?.phone ? (
        <>
          {reminderDue ? <Notice text={`${name} is ${days > 0 ? `${days}+ day${days === 1 ? '' : 's'} ` : ''}past due. Time to send a reminder.`} tone="late" /> : null}
          <View style={[styles.preview, { borderColor: t.muted.color as string }]}>
            <Text style={t.body}>{message}</Text>
          </View>
          <Text style={t.muted}>
            To {person.phone}
            {bag.reminded_at ? ` · last sent ${shortDate(bag.reminded_at)}` : ''}
          </Text>
          <Button title={`Text reminder to ${name}`} variant={reminderDue ? 'primary' : 'plain'} busy={busy} onPress={sendText} />
        </>
      ) : (
        <>
          <Text style={t.muted}>Add a phone number for {name} to text them a reminder.</Text>
          <Button title={`Add ${name}'s phone`} onPress={() => router.push(`/person/${bag.person_id}`)} />
        </>
      )}
      {error ? <Notice text={error} tone="late" /> : null}
      <Button
        title="Mark paid"
        variant="primary"
        busy={busy}
        onPress={() =>
          run(async () => {
            await markPaid(bag.id);
            toast(`${name} paid ${usd(bag.price)}. Moved to History.`);
            router.back();
          })
        }
      />
      <Button title="Undo take · put back on board" onPress={confirmUndo} />
    </Page>
  );
}

/* ---------- paid ---------- */
function PaidBag({ bag }: { bag: Bag }) {
  const t = useText();
  const toast = useToast();
  const { personName, markUnpaid } = useBoard();
  const name = personName(bag.person_id);
  const { busy, error, run } = useAction();
  return (
    <Page>
      <Stack.Screen options={{ title: 'Paid bag' }} />
      <Hero bag={bag} subtitle={`${usd(bag.price)} · paid`} />
      {[
        ['Taken by', name],
        ['Taken', bag.taken_at ? shortDate(bag.taken_at) : '—'],
        ['Paid', bag.paid_at ? shortDate(bag.paid_at) : '—'],
        ['Amount', usd(bag.price)],
        ...(bag.notes ? [['Notes', bag.notes]] : []),
      ].map(([k, v]) => (
        <View key={k} style={styles.kv}>
          <Text style={t.muted}>{k}</Text>
          <Text style={[t.strong, { flexShrink: 1, textAlign: 'right' }]}>{v}</Text>
        </View>
      ))}
      {error ? <Notice text={error} tone="late" /> : null}
      <Button
        title="Mark as not paid"
        busy={busy}
        onPress={() =>
          run(async () => {
            await markUnpaid(bag.id);
            toast(`Moved back to Owed. ${name} owes ${usd(bag.price)}.`);
            router.back();
          })
        }
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 14, borderRadius: 14 },
  heroInfo: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, flexShrink: 1 },
  heroG: { fontFamily: monoFont, fontWeight: '700', fontSize: 26, color: '#1B2027' },
  heroS: { fontSize: 13, color: '#4B5560' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  preview: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
});
