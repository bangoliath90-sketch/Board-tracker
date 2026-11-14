import { router } from 'expo-router';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { ItemIcon } from '../../components/UnitBox';
import { Button, Card, Label, Page, Row, useText } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { grams, shortDate, usd } from '../../lib/format';
import { costPerGram, costPerUnit, periodRange, summarize } from '../../lib/profit';
import { useColors } from '../../lib/theme';

type LossRow = { key: string; date: string; title: string; detail: string; amount: string; onPress: () => void; unit: boolean };

export default function StockScreen() {
  const c = useColors();
  const t = useText();
  const { stock: allStock, bags, totals, personName } = useBoard();
  const log = allStock.filter((s) => s.item !== 'unit' && s.kind !== 'loss');

  const cpg = useMemo(() => costPerGram(allStock), [allStock]);
  const cpu = useMemo(() => costPerUnit(allStock), [allStock]);
  const month = useMemo(() => summarize(bags, cpg, periodRange('month'), cpu, allStock), [bags, cpg, cpu, allStock]);

  // Every loss in one list: stock losses (grams or units) and written-off items, newest first.
  const losses: LossRow[] = [
    ...allStock
      .filter((s) => s.kind === 'loss')
      .map((s) => ({
        key: s.id,
        date: s.entry_date,
        unit: s.item === 'unit',
        title: s.item === 'unit' ? `${-s.grams} unit${s.grams === -1 ? '' : 's'} lost` : `${grams(-s.grams)} lost`,
        detail: s.note ?? '',
        amount: '',
        onPress: () => router.push(`/stock-entry?id=${s.id}`),
      })),
    ...bags
      .filter((b) => b.status === 'lost')
      .map((b) => ({
        key: b.id,
        date: (b.lost_at ?? b.taken_at ?? '').slice(0, 10),
        unit: b.item === 'unit',
        title: `Written off: ${personName(b.person_id)}`,
        detail: b.item === 'unit' ? '1 unit, never paid' : `${grams(b.grams)}, never paid`,
        amount: usd(b.price),
        onPress: () => router.push(`/bag/${b.id}`),
      })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const box = (label: string, value: number) => (
    <View style={{ flex: 1, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: c.muted }}>{label}</Text>
      <Text style={[t.mono, { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
        {grams(value)}
      </Text>
    </View>
  );

  const monthLossText = [
    month.lostGrams ? grams(month.lostGrams) : '',
    month.lostUnits ? `${month.lostUnits} unit${month.lostUnits === 1 ? '' : 's'}` : '',
  ]
    .filter(Boolean)
    .join(' and ');

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={[t.mono, { fontSize: 32 }]}>{grams(totals.onHand)}</Text>
        <Text style={t.muted}>on hand</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {box('Unbagged', totals.available)}
        {box('On board', totals.onBoard)}
        {box('Given out', totals.givenOut)}
      </View>
      <Text style={t.muted}>On hand goes down when someone takes a bag or you record a loss. Undoing a take puts the grams back.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Add restock" variant="primary" style={{ flex: 1 }} onPress={() => router.push('/stock-entry?kind=restock')} />
        <Button title="Adjust" style={{ flex: 1 }} onPress={() => router.push('/stock-entry?kind=adjust')} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Record loss" variant="danger" style={{ flex: 1 }} onPress={() => router.push('/stock-entry?kind=loss')} />
        <Button title="See profit" style={{ flex: 1 }} onPress={() => router.push('/profit')} />
      </View>

      <Label>Restocks and adjustments</Label>
      {log.length > 0 ? <Text style={t.muted}>Tap an entry to fix or delete it.</Text> : null}
      <Card>
        {log.length === 0 ? (
          <Text style={[t.muted, { padding: 20, textAlign: 'center' }]}>No inventory yet. Tap "Add restock" to enter your starting total.</Text>
        ) : (
          log.map((s, i) => (
            <Row key={s.id} last={i === log.length - 1} onPress={() => router.push(`/stock-entry?id=${s.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={t.strong}>
                  {s.kind === 'restock' ? 'Restock' : 'Adjustment'}
                  {s.note ? <Text style={{ fontWeight: '400' }}> · {s.note}</Text> : null}
                </Text>
                <Text style={t.muted}>
                  {shortDate(s.entry_date)}
                  {s.cost != null ? ` · paid ${usd(s.cost)}` : ''}
                </Text>
              </View>
              <Text style={[t.mono, { color: s.grams >= 0 ? c.ok : c.danger }]}>
                {s.grams >= 0 ? '+' : '−'}
                {grams(Math.abs(s.grams))}
              </Text>
            </Row>
          ))
        )}
      </Card>

      <Label>Losses</Label>
      <Text style={t.muted}>
        {monthLossText
          ? `This month: ${monthLossText} lost${month.lossCost != null ? `, costing you ${usd(Math.round(month.lossCost * 100) / 100)}` : ''}${
              month.writtenOff ? `. ${usd(month.writtenOff)} written off as never paid` : ''
            }.`
          : 'No losses this month.'}
      </Text>
      <Card>
        {losses.length === 0 ? (
          <Text style={[t.muted, { padding: 20, textAlign: 'center' }]}>
            Nothing lost yet. Use Record loss for spills or damage, Select on the board to mark bags lost, or Write off on an owed bag.
          </Text>
        ) : (
          losses.map((l, i) => (
            <Row key={l.key} last={i === losses.length - 1} onPress={l.onPress}>
              <ItemIcon bag={{ item: l.unit ? 'unit' : 'grams', grams: 14 }} width={26} danger />
              <View style={{ flex: 1 }}>
                <Text style={t.strong}>{l.title}</Text>
                <Text style={t.muted}>
                  {l.date ? shortDate(l.date) : ''}
                  {l.detail ? ` · ${l.detail}` : ''}
                </Text>
              </View>
              {l.amount ? <Text style={[t.mono, { color: c.danger }]}>{l.amount}</Text> : null}
            </Row>
          ))
        )}
      </Card>
    </Page>
  );
}
