import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Page, Row, useText } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { grams, shortDate, usd } from '../../lib/format';
import { useColors } from '../../lib/theme';

export default function StockScreen() {
  const c = useColors();
  const t = useText();
  const { stock: allStock, totals } = useBoard();
  const stock = allStock.filter((s) => s.item !== 'unit');

  const box = (label: string, value: number) => (
    <View style={{ flex: 1, backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: 10 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', color: c.muted }}>{label}</Text>
      <Text style={[t.mono, { fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
        {grams(value)}
      </Text>
    </View>
  );

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
      <Text style={t.muted}>On hand goes down only when someone takes a bag. Undoing a take puts the grams back.</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Add restock" variant="primary" style={{ flex: 1 }} onPress={() => router.push('/stock-entry?kind=restock')} />
        <Button title="Adjust" style={{ flex: 1 }} onPress={() => router.push('/stock-entry?kind=adjust')} />
      </View>
      <Button title="See profit" onPress={() => router.push('/profit')} />
      {stock.length > 0 ? <Text style={t.muted}>Tap an entry to fix or delete it.</Text> : null}
      <Card>
        {stock.length === 0 ? (
          <Text style={[t.muted, { padding: 20, textAlign: 'center' }]}>No inventory yet. Tap "Add restock" to enter your starting total.</Text>
        ) : (
          stock.map((s, i) => (
            <Row key={s.id} last={i === stock.length - 1} onPress={() => router.push(`/stock-entry?id=${s.id}`)}>
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
    </Page>
  );
}
