import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, Label, Notice, Page, useText } from '../components/ui';
import { useBoard } from '../lib/board';
import { grams, usd } from '../lib/format';
import { costPerGram, PERIODS, periodRange, summarize, weekly, type Period } from '../lib/profit';
import { monoFont, useColors } from '../lib/theme';

export default function ProfitScreen() {
  const c = useColors();
  const t = useText();
  const { bags, stock } = useBoard();
  const [period, setPeriod] = useState<Period>('month');

  const cpg = useMemo(() => costPerGram(stock), [stock]);
  const s = useMemo(() => summarize(bags, cpg, periodRange(period)), [bags, cpg, period]);
  const weeks = useMemo(() => weekly(bags, cpg, 8), [bags, cpg]);
  const maxSales = Math.max(1, ...weeks.map((w) => w.sales));

  const stat = (label: string, value: string, color?: string) => (
    <Card style={styles.stat}>
      <Label>{label}</Label>
      <Text style={[styles.statV, { color: color ?? c.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );

  return (
    <Page>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {PERIODS.map((p) => (
          <Chip key={p.value} label={p.label} on={period === p.value} onPress={() => setPeriod(p.value)} />
        ))}
      </ScrollView>

      {cpg == null ? (
        <Notice text="Add what you paid on your restocks (Stock → tap a restock) to see cost and profit." />
      ) : null}

      <View style={styles.rowStats}>
        {stat('Profit', s.profit == null ? '—' : usd(Math.round(s.profit * 100) / 100), s.profit != null && s.profit < 0 ? c.danger : c.ok)}
        {stat('Margin', s.margin == null ? '—' : `${Math.round(s.margin * 100)}%`)}
      </View>
      <View style={styles.rowStats}>
        {stat('Sales', usd(s.sales))}
        {stat('Cost', s.cost == null ? '—' : usd(Math.round(s.cost * 100) / 100))}
      </View>

      <Card>
        {[
          ['Bags taken', String(s.bagsSold)],
          ['Grams taken', grams(s.gramsSold)],
          ['Money collected', usd(s.collected)],
          ['From these bags, still owed', usd(s.stillOwed)],
          ['Average price per gram', s.pricePerGram == null ? '—' : `${usd(Math.round(s.pricePerGram * 100) / 100)}/g`],
          ['Your cost per gram', cpg == null ? '—' : `${usd(Math.round(cpg * 100) / 100)}/g`],
        ].map(([k, v], i, arr) => (
          <View key={k} style={[styles.kv, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]}>
            <Text style={t.muted}>{k}</Text>
            <Text style={[t.strong, { fontFamily: monoFont }]}>{v}</Text>
          </View>
        ))}
      </Card>
      <Text style={t.muted}>
        Sales count every bag taken in the period, paid or not. Money collected counts payments received in the period.
      </Text>

      <Label>Last 8 weeks</Label>
      <Card style={{ padding: 12, gap: 10 }}>
        {weeks.map((w) => {
          const salesW = (w.sales / maxSales) * 100;
          const profitW = w.profit != null && w.profit > 0 ? (Math.min(w.profit, w.sales) / maxSales) * 100 : 0;
          return (
            <View key={w.start.toISOString()} style={styles.week}>
              <Text style={[t.muted, styles.weekLabel]}>{w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
              <View style={[styles.track, { backgroundColor: c.surface2 }]}>
                <View style={[styles.bar, { width: `${salesW}%`, backgroundColor: c.liquid, opacity: 0.35 }]} />
                <View style={[styles.bar, { width: `${profitW}%`, backgroundColor: c.liquidDeep }]} />
              </View>
              <Text style={[styles.weekV, { color: c.ink }]} numberOfLines={1}>
                {usd(w.sales)}
              </Text>
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Legend color={c.liquid} faded label="Sales" />
          {cpg != null ? <Legend color={c.liquidDeep} label="Profit" /> : null}
        </View>
      </Card>
      {cpg == null ? <Button title="Go to Stock" onPress={() => router.push('/stock')} /> : null}
    </Page>
  );
}

function Legend({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color, opacity: faded ? 0.35 : 1 }} />
      <Text style={{ color: c.muted, fontSize: 12.5 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rowStats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 12 },
  statV: { fontFamily: monoFont, fontWeight: '700', fontSize: 22, marginTop: 2 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 11, paddingHorizontal: 14 },
  week: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekLabel: { width: 48, fontSize: 12.5 },
  track: { flex: 1, height: 14, borderRadius: 4, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  weekV: { width: 64, textAlign: 'right', fontFamily: monoFont, fontSize: 12.5 },
});
