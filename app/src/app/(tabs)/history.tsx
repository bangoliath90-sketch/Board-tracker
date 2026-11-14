import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ItemIcon } from '../../components/UnitBox';
import { Button, Card, Page, Row, useText } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { itemLabel, shortDate, usd } from '../../lib/format';
import { useColors } from '../../lib/theme';

export default function HistoryScreen() {
  const c = useColors();
  const t = useText();
  const { bags, totals, personName } = useBoard();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const paid = bags
    .filter((b) => b.status === 'paid' && (!q || personName(b.person_id).toLowerCase().includes(q)))
    .sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''));

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={[t.mono, { fontSize: 32, color: c.ok }]}>{usd(totals.collected)}</Text>
        <Text style={t.muted}>collected</Text>
      </View>
      <Button title="See profit" onPress={() => router.push('/profit')} />
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name"
        placeholderTextColor={c.muted}
        accessibilityLabel="Search history by name"
        style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 12, padding: 11, fontSize: 16, color: c.ink }}
      />
      <Card>
        {paid.length === 0 ? (
          <Text style={[t.muted, { padding: 20, textAlign: 'center' }]}>{q ? 'No paid bags match.' : 'Paid bags will show up here.'}</Text>
        ) : (
          paid.map((b, i) => (
            <Row key={b.id} last={i === paid.length - 1} onPress={() => router.push(`/bag/${b.id}`)}>
              <ItemIcon bag={b} width={30} />
              <View style={{ flex: 1 }}>
                <Text style={t.strong}>{personName(b.person_id)}</Text>
                <Text style={t.muted}>
                  {itemLabel(b)} · paid {b.paid_at ? shortDate(b.paid_at) : ''}
                </Text>
              </View>
              <Text style={[t.mono, { color: c.ok }]}>{usd(b.price)}</Text>
            </Row>
          ))
        )}
      </Card>
    </Page>
  );
}
