import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../lib/theme';
import { Button, Field } from './ui';

type Props = {
  /** e.g. "3 bags · 21 g" */
  summary: string;
  count: number;
  allSelected: boolean;
  /** Button text for putting items back, e.g. "Return to stock". */
  returnLabel: string;
  /** Confirmation text for putting items back. */
  returnMessage: string;
  onSelectAll: () => void;
  onClear: () => void;
  onDone: () => void;
  onReturn: () => Promise<void>;
  onLost: (reason: string) => Promise<void>;
  /** Optional main action for the selection, e.g. "Take 5 units". */
  takeLabel?: string;
  onTake?: () => void;
};

/** Actions for several selected bags or units at once. */
export function SelectionBar(props: Props) {
  const c = useColors();
  const [confirmLoss, setConfirmLoss] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'return' | 'lost' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const none = props.count === 0;

  async function run(which: 'return' | 'lost', fn: () => Promise<void>) {
    setError(null);
    setBusy(which);
    try {
      await fn();
      setConfirmLoss(false);
      setReason('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.bar, { backgroundColor: c.surface, borderColor: c.accent }]}>
      <View style={styles.top}>
        <Text style={{ color: c.ink, fontWeight: '700', flex: 1 }}>{none ? 'Tap items to select them' : `Selected: ${props.summary}`}</Text>
        <Text accessibilityRole="button" onPress={props.allSelected ? props.onClear : props.onSelectAll} style={{ color: c.accent, fontWeight: '600' }}>
          {props.allSelected ? 'Clear' : 'Select all'}
        </Text>
      </View>
      {confirmLoss ? (
        <>
          <Field label="Reason (optional)" value={reason} onChangeText={setReason} placeholder="e.g. damaged, spilled, stolen" />
          <View style={styles.row}>
            <Button title="Back" style={{ flex: 1 }} onPress={() => setConfirmLoss(false)} />
            <Button
              title={`Mark ${props.count} lost`}
              variant="danger"
              style={{ flex: 1.4 }}
              busy={busy === 'lost'}
              onPress={() => run('lost', () => props.onLost(reason))}
            />
          </View>
        </>
      ) : (
        <>
        {props.onTake ? (
          <Button title={props.takeLabel ?? 'Take'} variant="primary" disabled={none} onPress={props.onTake} />
        ) : null}
        <View style={styles.row}>
          <Button
            title={props.returnLabel}
            variant={props.onTake ? 'plain' : 'primary'}
            style={{ flex: 1.3 }}
            disabled={none}
            busy={busy === 'return'}
            onPress={() =>
              Alert.alert(props.returnLabel, props.returnMessage, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes', onPress: () => run('return', props.onReturn) },
              ])
            }
          />
          <Button title="Mark lost" variant="danger" style={{ flex: 1 }} disabled={none} onPress={() => setConfirmLoss(true)} />
        </View>
        </>
      )}
      {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
      <Button title="Done" onPress={props.onDone} />
    </View>
  );
}

/** A check mark drawn over a selected item. */
export function SelectedMark({ on }: { on: boolean }) {
  const c = useColors();
  return (
    <View
      pointerEvents="none"
      style={[
        styles.mark,
        { backgroundColor: on ? c.accent : 'rgba(255,255,255,0.85)', borderColor: on ? c.accent : c.bagStroke },
      ]}
    >
      {on ? <Text style={{ color: c.accentInk, fontWeight: '800', fontSize: 13, lineHeight: 15 }}>✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderWidth: 2, borderRadius: 14, padding: 12, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 8 },
  mark: { position: 'absolute', top: 2, right: 2, width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
