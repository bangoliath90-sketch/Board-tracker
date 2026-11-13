import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Card, Page, Pill, Row, useText } from '../../components/ui';
import { useBoard } from '../../lib/board';
import { daysUntil, usd } from '../../lib/format';

export default function PeopleScreen() {
  const t = useText();
  const { people, bags } = useBoard();

  const rows = people
    .map((p) => {
      const mine = bags.filter((b) => b.person_id === p.id);
      const owing = mine.filter((b) => b.status === 'taken');
      return {
        p,
        count: mine.filter((b) => b.status !== 'on_board').length,
        owe: owing.reduce((s, b) => s + b.price, 0),
        late: owing.some((b) => b.due_date && daysUntil(b.due_date) < 0),
      };
    })
    .sort((a, b) => b.owe - a.owe || a.p.name.localeCompare(b.p.name));

  return (
    <Page>
      <Text style={t.muted}>Everyone who has grabbed a bag. Tap a name to see what they owe and their history.</Text>
      <Button title="Add person" variant="primary" onPress={() => router.push('/person/new')} />
      <Card>
        {rows.length === 0 ? (
          <Text style={[t.muted, { padding: 20, textAlign: 'center' }]}>No people yet. They're added when someone takes a bag, or with the button above.</Text>
        ) : (
          rows.map(({ p, count, owe, late }, i) => (
            <Row key={p.id} last={i === rows.length - 1} onPress={() => router.push(`/person/${p.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={t.strong}>{p.name}</Text>
                <Text style={t.muted}>
                  {count} bag{count === 1 ? '' : 's'} taken
                </Text>
              </View>
              {owe > 0 ? <Pill text={`Owes ${usd(owe)}`} tone={late ? 'late' : 'soon'} /> : <Pill text="Paid up" tone="ok" />}
            </Row>
          ))
        )}
      </Card>
    </Page>
  );
}
