import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SelectedMark, SelectionBar } from '../../components/SelectionBar';
import { Button, Card, Label, Page, useText, useToast } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { shortDate, usd } from '../../lib/format';
import { DEFAULT_UNIT_CAPACITY, DEFAULT_UNIT_PRICE } from '../../lib/units';
import { monoFont, useColors } from '../../lib/theme';

const COLUMNS = 5;
const GAP = 6;

export default function UnitsScreen() {
  const c = useColors();
  const t = useText();
  const toast = useToast();
  const { board, bags, stock, returnToStock, markLost } = useBoard();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [width, setWidth] = useState(0);
  const capacity = board?.unit_capacity ?? DEFAULT_UNIT_CAPACITY;
  const price = board?.unit_price ?? DEFAULT_UNIT_PRICE;

  const inBox = bags
    .filter((b) => b.item === 'unit' && b.status === 'on_board')
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const owed = bags.filter((b) => b.item === 'unit' && b.status === 'taken');
  const restocks = stock.filter((s) => s.item === 'unit').slice(0, 5);
  const value = inBox.reduce((s, b) => s + b.price, 0);
  const slotW = width ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const slots = Array.from({ length: Math.max(capacity, inBox.length) }, (_, i) => inBox[i] ?? null);
  const picked = inBox.filter((u) => selected.has(u.id));
  const n = picked.length;
  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const finish = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  return (
    <Page>
      <View style={styles.statsRow}>
        <Card style={styles.stat}>
          <Label>In the box</Label>
          <Text style={[styles.statV, { color: c.ink }]}>
            {inBox.length}
            <Text style={{ color: c.muted, fontSize: 15 }}> / {capacity}</Text>
          </Text>
        </Card>
        <Card style={styles.stat}>
          <Label>Box value</Label>
          <Text style={[styles.statV, { color: c.ink }]} numberOfLines={1} adjustsFontSizeToFit>
            {usd(value)}
          </Text>
        </Card>
      </View>
      <Text style={t.muted}>
        Each unit is {usd(price)} unless you change it. Tap a unit to record who took it.
        {owed.length ? ` ${owed.length} unit${owed.length === 1 ? ' is' : 's are'} on the Owed page.` : ''}
      </Text>
      {selecting ? (
        <SelectionBar
          count={n}
          summary={`${n} unit${n === 1 ? '' : 's'} · ${usd(picked.reduce((s, u) => s + u.price, 0))}`}
          allSelected={n === inBox.length && n > 0}
          takeLabel={n ? `Take ${n} unit${n === 1 ? '' : 's'} · ${usd(picked.reduce((s, u) => s + u.price, 0))}` : 'Take'}
          onTake={() => {
            const ids = picked.map((u) => u.id).join(',');
            finish();
            router.push(`/take-units?ids=${ids}`);
          }}
          returnLabel="Remove from box"
          returnMessage={`Take ${n} unit${n === 1 ? '' : 's'} out of the box? They're removed without being recorded as a loss.`}
          onSelectAll={() => setSelected(new Set(inBox.map((u) => u.id)))}
          onClear={() => setSelected(new Set())}
          onDone={finish}
          onReturn={async () => {
            await returnToStock(picked.map((u) => u.id));
            toast(`Removed ${n} unit${n === 1 ? '' : 's'} from the box.`);
            finish();
          }}
          onLost={async (reason) => {
            await markLost(picked.map((u) => u.id), reason);
            toast(`Recorded ${n} unit${n === 1 ? '' : 's'} as lost.`);
            finish();
          }}
        />
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Add units" variant="primary" style={{ flex: 1 }} onPress={() => router.push('/add-units')} />
          {inBox.length > 0 ? <Button title="Select" style={{ flex: 1 }} onPress={() => setSelecting(true)} /> : null}
        </View>
      )}

      <View style={[styles.box, { borderColor: c.boardFrame, backgroundColor: c.surface2 }]}>
        <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {slotW > 0 &&
            slots.map((unit, i) =>
              unit ? (
                <Pressable
                  key={unit.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Unit ${i + 1}, ${usd(unit.price)}. ${selecting ? (selected.has(unit.id) ? 'Selected.' : 'Not selected.') : 'Open unit.'}`}
                  accessibilityState={selecting ? { selected: selected.has(unit.id) } : undefined}
                  onPress={() => (selecting ? toggle(unit.id) : router.push(`/bag/${unit.id}`))}
                  style={({ pressed }) => [
                    styles.slot,
                    { width: slotW, backgroundColor: c.liquid, borderColor: c.liquidDeep },
                    selecting && !selected.has(unit.id) && { opacity: 0.5 },
                    selecting && selected.has(unit.id) && { borderColor: c.accent, borderWidth: 2.5 },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {selecting && selected.has(unit.id) ? <SelectedMark on /> : null}
                  <Text style={styles.num}>{i + 1}</Text>
                  <Text style={styles.price}>{usd(unit.price)}</Text>
                </Pressable>
              ) : (
                <Pressable
                  key={`empty-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Empty slot ${i + 1}. Add units.`}
                  disabled={selecting}
                  onPress={() => router.push('/add-units')}
                  style={[styles.slot, styles.empty, { width: slotW, borderColor: c.line }]}
                >
                  <Text style={[styles.num, { color: c.muted }]}>{i + 1}</Text>
                </Pressable>
              ),
            )}
        </View>
      </View>

      {restocks.length ? (
        <>
          <Label>Recent unit restocks</Label>
          <Card>
            {restocks.map((s, i) => (
              <View key={s.id} style={[styles.row, i < restocks.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
                <Text style={t.body}>
                  {shortDate(s.entry_date)}
                  {s.note ? <Text style={t.muted}> · {s.note}</Text> : null}
                </Text>
                <Text style={[t.mono, { color: c.ok }]}>
                  +{s.grams} unit{s.grams === 1 ? '' : 's'}
                  {s.cost != null ? <Text style={t.muted}> · {usd(s.cost)}</Text> : null}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 12 },
  statV: { fontFamily: monoFont, fontWeight: '700', fontSize: 22, marginTop: 2 },
  box: { borderWidth: 6, borderRadius: 12, padding: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  slot: { height: 46, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  num: { fontFamily: monoFont, fontWeight: '700', fontSize: 12, color: '#06211C' },
  price: { fontSize: 10.5, color: '#06211C' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
});
