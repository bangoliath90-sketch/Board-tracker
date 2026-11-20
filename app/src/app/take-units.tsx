import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DateField } from '../components/DateField';
import { UnitBox } from '../components/UnitBox';
import { Button, Chip, Field, Label, Notice, Page, Segmented, useText, useToast } from '../components/ui';
import { useBoard } from '../lib/board';
import { pickContact } from '../lib/contacts';
import { addDays, parseAmount, usd } from '../lib/format';
import { monoFont, useColors } from '../lib/theme';

/** Record several units from the box as taken by one person, in one go. */
export default function TakeUnits() {
  const { ids: idParam } = useLocalSearchParams<{ ids?: string }>();
  const c = useColors();
  const t = useText();
  const toast = useToast();
  const { bags, people, takeMany } = useBoard();

  const wanted = useMemo(() => new Set((idParam ?? '').split(',').filter(Boolean)), [idParam]);
  // Only units still in the box (someone else may have taken some meanwhile).
  const units = bags.filter((b) => wanted.has(b.id) && b.item === 'unit' && b.status === 'on_board');
  const n = units.length;
  const prices = [...new Set(units.map((u) => u.price))];
  const samePrice = prices.length === 1 ? prices[0] : null;

  const [personId, setPersonId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [phone, setPhone] = useState('');
  const [adding, setAdding] = useState(people.length === 0);
  const [priceEach, setPriceEach] = useState(samePrice != null ? String(samePrice) : '');
  const [mode, setMode] = useState<'owes' | 'paid'>('owes');
  const [due, setDue] = useState(addDays(7));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const each = priceEach.trim() ? parseAmount(priceEach) : null;
  const total = each != null ? each * n : units.reduce((s, u) => s + u.price, 0);
  const selected = people.find((p) => p.id === personId);

  async function fromContacts() {
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
  }

  async function submit() {
    setError(null);
    if (n === 0) return setError('None of these units are in the box any more.');
    if (!personId && !newName.trim()) return setError('Choose who took them.');
    if (priceEach.trim() && (each == null || each < 0)) return setError('Enter the price each as a number, or leave it blank to keep each unit\'s price.');
    setBusy(true);
    try {
      const res = await takeMany(
        units.map((u) => u.id),
        {
          personId: adding ? undefined : personId ?? undefined,
          newPersonName: adding ? newName : undefined,
          phone: phone || null,
          price: each,
          paid: mode === 'paid',
          dueDate: mode === 'paid' ? null : due,
          notes,
        },
      );
      const what = `${res.count} unit${res.count === 1 ? '' : 's'}`;
      toast(
        mode === 'paid'
          ? `${res.personName} paid ${usd(total)} for ${what}. Moved to History.`
          : `${res.personName} owes ${usd(total)} for ${what}. Moved to Owed.`,
      );
      if (res.count < n) setTimeout(() => toast(`${n - res.count} had already been taken by someone else.`), 3600);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Page>
      <View style={[styles.summary, { backgroundColor: c.surface2, borderColor: c.line }]}>
        <View style={styles.boxes}>
          {units.slice(0, 12).map((u) => (
            <UnitBox key={u.id} width={22} />
          ))}
          {n > 12 ? <Text style={t.muted}>+{n - 12}</Text> : null}
        </View>
        <Text style={[t.strong, { fontFamily: monoFont }]}>
          {n} unit{n === 1 ? '' : 's'} · {usd(total)}
        </Text>
      </View>

      <Label>Who took them?</Label>
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

      <Field
        label="Price each ($)"
        value={priceEach}
        onChangeText={setPriceEach}
        keyboardType="decimal-pad"
        placeholder={samePrice == null ? 'Leave blank to keep each unit\'s price' : undefined}
        mono
      />
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
      {mode === 'owes' ? (
        <Text style={t.muted}>Each unit shows separately on Owed, where you mark them paid.</Text>
      ) : null}
      {error ? <Notice text={error} tone="late" /> : null}
      <Button title={`Mark ${n} unit${n === 1 ? '' : 's'} taken · ${usd(total)}`} variant="primary" busy={busy} disabled={n === 0} onPress={submit} />
    </Page>
  );
}

const styles = StyleSheet.create({
  summary: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  boxes: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
