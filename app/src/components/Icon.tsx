import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'board' | 'units' | 'owed' | 'people' | 'stock' | 'history' | 'settings' | 'plus';

export function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'board' && (
        <>
          <Rect x={4} y={4} width={16} height={16} rx={1.5} {...p} />
          <Circle cx={9} cy={9} r={0.9} fill={color} />
          <Circle cx={15} cy={9} r={0.9} fill={color} />
          <Circle cx={9} cy={15} r={0.9} fill={color} />
          <Circle cx={15} cy={15} r={0.9} fill={color} />
        </>
      )}
      {name === 'units' && (
        <>
          <Rect x={3} y={5} width={18} height={14} rx={1.5} {...p} />
          <Path d="M9 5v14M15 5v14M3 12h18" {...p} />
        </>
      )}
      {name === 'owed' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 7v5l3 2" {...p} />
        </>
      )}
      {name === 'people' && (
        <>
          <Circle cx={9} cy={8} r={3.5} {...p} />
          <Path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.8.7 3 2.4 3.5 5.2" {...p} />
        </>
      )}
      {name === 'stock' && <Path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10" {...p} />}
      {name === 'history' && <Path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 8v4l3 2" {...p} />}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" {...p} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...p} />}
    </Svg>
  );
}
