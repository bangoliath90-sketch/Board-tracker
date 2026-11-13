import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { LiquidBag } from '../../components/LiquidBag';
import { Card, Page, Pill, Row, useText } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { dueInfo, grams, shortDate, usd } from '../../lib/format';
import { useColors } from '../../lib/theme';

export default function OwedScreen() {
  const c = useColors();
  const t = useText();
  const { bags, totals, personName } = useBoard();
  const owed = bags
    .filter((b) => b.status === 'taken')
    .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));

  return (
    <Page>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={[t.mono, { fontSize: 32, color: totals.owed ? c.danger : c.ink }]}>{usd(totals.owed)}</Text>
        <Text style={t.muted}>
          owed across {owed.length} bag{owed.length === 1 ? '' : 's'}
        </Text>
      </View>
      <Card>
        {owed.length === 0 ? (
          <Text style={[t.muted, { padding: 20, textAlign: 'center' }]}>Nobody owes you anything right now.</Text>
        ) : (
          owed.map((b, i) => {
            const d = dueInfo(b);
            return (
              <Row key={b.id} last={i === owed.length - 1} onPress={() => router.push(`/bag/${b.id}`)}>
                <LiquidBag grams={b.grams} width={30} danger={d.tone === 'late'} />
                <View style={{ flex: 1 }}>
                  <Text style={t.strong}>{personName(b.person_id)}</Text>
                  <Text style={t.muted}>
                    {grams(b.grams)} · taken {b.taken_at ? shortDate(b.taken_at) : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={t.mono}>{usd(b.price)}</Text>
                  <Pill text={d.label} tone={d.tone === 'none' ? 'none' : d.tone} />
                </View>
              </Row>
            );
          })
        )}
      </Card>
    </Page>
  );
}
