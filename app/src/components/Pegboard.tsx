import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { useColors } from '../lib/theme';

/** A wooden pegboard with a grid of holes behind its children. */
export function Pegboard({ children, style, framed = true }: { children: ReactNode; style?: ViewStyle; framed?: boolean }) {
  const c = useColors();
  return (
    <View
      style={[
        styles.board,
        { backgroundColor: c.board, borderColor: c.boardFrame, borderWidth: framed ? 7 : 0 },
        style,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="holes" width={22} height={22} patternUnits="userSpaceOnUse">
            <Circle cx={11} cy={11} r={2.4} fill={c.boardHole} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#holes)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { borderRadius: 10, overflow: 'hidden' },
});
