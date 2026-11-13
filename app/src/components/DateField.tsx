import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, Text, View } from 'react-native';
import { addDays, isoDate, parseDate } from '../lib/format';
import { useColors } from '../lib/theme';
import { Chip, Label } from './ui';

/** Pick a date: quick choices plus the phone's own date picker. Value is YYYY-MM-DD. */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const c = useColors();
  const quick = [
    { label: '3 days', v: addDays(3) },
    { label: '1 week', v: addDays(7) },
    { label: '2 weeks', v: addDays(14) },
  ];
  const date = parseDate(value);
  const pretty = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {quick.map((q) => (
          <Chip key={q.label} label={q.label} on={value === q.v} onPress={() => onChange(q.v)} style={{ flex: 1 }} />
        ))}
      </View>
      {Platform.OS === 'ios' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: c.muted }}>Or pick a date</Text>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            onChange={(_e, d) => {
              if (d) onChange(isoDate(d));
            }}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            DateTimePickerAndroid.open({
              value: date,
              mode: 'date',
              onChange: (e, d) => {
                if (e.type === 'set' && d) onChange(isoDate(d));
              },
            })
          }
          style={{ borderWidth: 1, borderColor: c.line, backgroundColor: c.surface2, borderRadius: 12, padding: 12 }}
        >
          <Text style={{ color: c.ink, fontSize: 16 }}>{pretty}</Text>
        </Pressable>
      )}
    </View>
  );
}
