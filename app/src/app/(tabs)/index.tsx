import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LiquidBag } from '../../components/LiquidBag';
import { Pegboard } from '../../components/Pegboard';
import { SelectedMark, SelectionBar } from '../../components/SelectionBar';
import { useToast } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { grams, usd } from '../../lib/format';
import { monoFont, useColors } from '../../lib/theme';

const COLUMNS = 3;
const GAP = 10;

export default function BoardScreen() {
  const c = useColors();
  const toast = useToast();
  const { board, bags, totals, reload, returnToStock, markLost } = useBoard();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [width, setWidth] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Smallest to largest; bags of the same size stay in the order they were hung.
  const hanging = bags
    .filter((b) => b.status === 'on_board' && b.item !== 'unit')
    .sort((a, b) => a.grams - b.grams || a.created_at.localeCompare(b.created_at));
  const tileW = width ? (width - GAP * (COLUMNS - 1)) / COLUMNS : 0;
  const picked = hanging.filter((b) => selected.has(b.id));
  const pickedGrams = picked.reduce((s, b) => s + b.grams, 0);
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

  const stat = (label: string, value: string, color?: string) => (
    <View style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}>
      <Text style={[styles.statK, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.statV, { color: color ?? c.ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await reload();
            setRefreshing(false);
          }}
        />
      }
    >
      <Text style={{ color: c.muted, fontSize: 13 }}>{board?.name}</Text>
      <View style={styles.stats}>
        {stat('On hand', grams(totals.onHand))}
        {stat('Bagged on board', grams(totals.onBoard))}
      </View>
      <View style={styles.stats}>
        {stat('Owed to you', usd(totals.owed), c.danger)}
        {stat('Collected', usd(totals.collected), c.ok)}
      </View>
      <View style={styles.avail}>
        <Text style={{ color: c.muted, fontSize: 13 }}>Unbagged, ready to portion</Text>
        <Text style={{ color: totals.available < 0 ? c.danger : c.ink, fontFamily: monoFont, fontWeight: '700' }}>{grams(totals.available)}</Text>
      </View>
      {selecting ? (
        <SelectionBar
          count={picked.length}
          summary={`${picked.length} bag${picked.length === 1 ? '' : 's'} · ${grams(pickedGrams)}`}
          allSelected={picked.length === hanging.length && hanging.length > 0}
          returnLabel="Return to stock"
          returnMessage={`Take ${picked.length} bag${picked.length === 1 ? '' : 's'} off the board? ${grams(pickedGrams)} goes back to your unbagged grams.`}
          onSelectAll={() => setSelected(new Set(hanging.map((b) => b.id)))}
          onClear={() => setSelected(new Set())}
          onDone={finish}
          onReturn={async () => {
            await returnToStock(picked.map((b) => b.id));
            toast(`${grams(pickedGrams)} went back to unbagged stock.`);
            finish();
          }}
          onLost={async (reason) => {
            await markLost(picked.map((b) => b.id), reason);
            toast(`Recorded ${grams(pickedGrams)} as lost.`);
            finish();
          }}
        />
      ) : hanging.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => setSelecting(true)} style={styles.selectBtn} hitSlop={6}>
          <Text style={{ color: c.accent, fontWeight: '600' }}>Select bags</Text>
        </Pressable>
      ) : null}

      <Pegboard style={{ padding: 12, paddingBottom: 18 }}>
        <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {tileW > 0 &&
            hanging.map((b) => (
              <Pressable
                key={b.id}
                accessibilityRole="button"
                accessibilityLabel={`${grams(b.grams)} bag, ${usd(b.price)}. ${selecting ? (selected.has(b.id) ? 'Selected.' : 'Not selected.') : 'Open bag.'}`}
                accessibilityState={selecting ? { selected: selected.has(b.id) } : undefined}
                onPress={() => (selecting ? toggle(b.id) : router.push(`/bag/${b.id}`))}
                style={({ pressed }) => [
                  styles.tile,
                  { width: tileW },
                  selecting && !selected.has(b.id) && { opacity: 0.6 },
                  pressed && { transform: [{ rotate: '-2deg' }] },
                ]}
              >
                {selecting ? <SelectedMark on={selected.has(b.id)} /> : null}
                <LiquidBag grams={b.grams} width={Math.min(tileW * 0.9, 112)} />
                <View style={styles.meta}>
                  <Text style={styles.metaG}>{grams(b.grams)}</Text>
                  <Text style={styles.metaP}>{usd(b.price)}</Text>
                </View>
              </Pressable>
            ))}
          {tileW > 0 && !selecting && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New bag"
              onPress={() => router.push('/new-bag')}
              style={({ pressed }) => [styles.addSlot, { width: tileW, minHeight: tileW * 1.5 }, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.addPlus}>+</Text>
              <Text style={styles.addText}>New bag</Text>
            </Pressable>
          )}
        </View>
      </Pegboard>
      <Text style={{ color: c.muted, fontSize: 12.5 }}>
        Tap a bag to open it. Liquid shows grams, and 28 g fills a bag. When someone takes a bag and still owes, it moves to Owed. Paid bags move to History.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12 },
  statK: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  statV: { fontFamily: monoFont, fontWeight: '700', fontSize: 20 },
  selectBtn: { alignSelf: 'flex-end', paddingVertical: 2 },
  avail: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, marginBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP, rowGap: 18 },
  tile: { alignItems: 'center', gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'baseline', gap: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 1 },
  metaG: { fontFamily: monoFont, fontWeight: '700', fontSize: 13, color: '#1B2027' },
  metaP: { fontSize: 12, color: '#4B5560' },
  addSlot: { borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.75)', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', gap: 2 },
  addPlus: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontWeight: '600' },
  addText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
