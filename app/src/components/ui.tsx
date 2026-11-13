import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { monoFont, useColors, type Colors } from '../lib/theme';

type Variant = 'primary' | 'plain' | 'danger' | 'warn';

export function Button({
  title,
  onPress,
  variant = 'plain',
  busy = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const c = useColors();
  const bg: Record<Variant, string> = { primary: c.accent, plain: c.surface, danger: c.dangerBg, warn: c.warn };
  const fg: Record<Variant, string> = { primary: c.accentInk, plain: c.ink, danger: c.danger, warn: '#FFFFFF' };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg[variant], borderColor: variant === 'plain' ? c.line : bg[variant] },
        (disabled || pressed) && { opacity: disabled ? 0.5 : 0.8 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg[variant]} /> : <Text style={[styles.btnText, { color: fg[variant] }]}>{title}</Text>}
    </Pressable>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text style={[styles.label, { color: c.muted }]}>{children}</Text>;
}

export function Field({ label, mono, style, ...props }: TextInputProps & { label: string; mono?: boolean }) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={c.muted}
        style={[
          styles.input,
          { backgroundColor: c.surface2, borderColor: c.line, color: c.ink },
          mono && { fontFamily: monoFont },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; color?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.seg, { backgroundColor: c.surface2, borderColor: c.line }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segBtn, on && { backgroundColor: c.surface, shadowOpacity: 0.12 }]}
          >
            <Text style={{ fontWeight: '600', color: on ? o.color ?? c.ink : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, sub, on, onPress, style }: { label: string; sub?: string; on: boolean; onPress: () => void; style?: ViewStyle }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: on ? c.accent : c.surface2, borderColor: on ? c.accent : c.line },
        style,
      ]}
    >
      <Text style={{ fontFamily: sub ? monoFont : undefined, fontWeight: '700', fontSize: sub ? 16 : 14, color: on ? c.accentInk : c.ink }}>
        {label}
      </Text>
      {sub ? <Text style={{ fontSize: 12, color: on ? c.accentInk : c.muted }}>{sub}</Text> : null}
    </Pressable>
  );
}

export type Tone = 'none' | 'ok' | 'soon' | 'late';
export function Pill({ text, tone = 'none' }: { text: string; tone?: Tone }) {
  const c = useColors();
  const map: Record<Tone, [string, string]> = {
    none: [c.surface2, c.muted],
    ok: [c.okBg, c.ok],
    soon: [c.warnBg, c.warn],
    late: [c.dangerBg, c.danger],
  };
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function Row({ children, onPress, last }: { children: ReactNode; onPress?: () => void; last?: boolean }) {
  const c = useColors();
  const style = [styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }];
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && { backgroundColor: c.surface2 }]}>
      {children}
    </Pressable>
  );
}

/** Scrollable page body with the standard background and padding. */
export function Page({ children, bottomPad = 32 }: { children: ReactNode; bottomPad?: number }) {
  const c = useColors();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: bottomPad, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function useText() {
  const c = useColors();
  return makeText(c);
}
function makeText(c: Colors) {
  return {
    h1: { fontSize: 24, fontWeight: '800', color: c.ink } as TextStyle,
    body: { fontSize: 15, color: c.ink } as TextStyle,
    muted: { fontSize: 13.5, color: c.muted } as TextStyle,
    strong: { fontSize: 15, fontWeight: '600', color: c.ink } as TextStyle,
    mono: { fontFamily: monoFont, fontWeight: '700', color: c.ink } as TextStyle,
  };
}

export function Notice({ text, tone = 'soon' }: { text: string; tone?: Tone }) {
  const c = useColors();
  const bg = tone === 'late' ? c.dangerBg : tone === 'ok' ? c.okBg : c.warnBg;
  const fg = tone === 'late' ? c.danger : tone === 'ok' ? c.ok : c.warn;
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

/* ---------- toast ---------- */
const ToastContext = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg ? (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 70 }]}>
          <View accessibilityLiveRegion="polite" style={[styles.toast, { backgroundColor: c.ink }]}>
            <Text style={{ color: c.bg, fontSize: 14 }}>{msg}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  btn: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  btnText: { fontWeight: '600', fontSize: 15.5 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  field: { gap: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 3, gap: 3 },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowRadius: 3, shadowOpacity: 0 },
  chip: { borderWidth: 1, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  pill: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  notice: { borderRadius: 12, padding: 12 },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, maxWidth: 440 },
});
