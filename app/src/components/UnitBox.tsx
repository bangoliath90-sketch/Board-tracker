import { Text, View } from 'react-native';
import type { Bag } from '../lib/types';
import { monoFont, useColors } from '../lib/theme';
import { LiquidBag } from './LiquidBag';

/** One unit drawn as a small filled rectangle, optionally numbered. */
export function UnitBox({ width = 30, label, danger = false }: { width?: number; label?: string; danger?: boolean }) {
  const c = useColors();
  return (
    <View
      style={{
        width,
        height: width * 0.7,
        borderRadius: Math.max(3, width * 0.1),
        backgroundColor: c.liquid,
        borderWidth: danger ? 2 : 1,
        borderColor: danger ? c.danger : c.liquidDeep,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {label ? (
        <Text style={{ fontFamily: monoFont, fontWeight: '700', fontSize: Math.max(9, width * 0.26), color: '#06211C' }}>{label}</Text>
      ) : null}
    </View>
  );
}

/** The right picture for a bag or a unit in lists. */
export function ItemIcon({ bag, width = 30, danger = false }: { bag: Pick<Bag, 'item' | 'grams'>; width?: number; danger?: boolean }) {
  if (bag.item === 'unit') return <UnitBox width={width} danger={danger} />;
  return <LiquidBag grams={bag.grams} width={width} danger={danger} />;
}
