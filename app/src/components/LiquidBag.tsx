import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '../lib/theme';

/** Bags are drawn so that 28 g fills the bag to the top. */
export const FULL_BAG_GRAMS = 28;

// One shared wave clock for every bag on screen.
const wave = new Animated.Value(0);
let started = false;
function startWave() {
  if (started) return;
  started = true;
  Animated.loop(
    Animated.timing(wave, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true }),
  ).start();
}

function wavePath(width: number, period: number, amp: number, height: number) {
  let d = `M0 ${amp}`;
  for (let x = 0; x < width; x += period) {
    d += ` q${period / 4} ${-amp} ${period / 2} 0 q${period / 4} ${amp} ${period / 2} 0`;
  }
  return `${d} V${height} H0 Z`;
}

type Props = { grams: number; width?: number; danger?: boolean };

export function LiquidBag({ grams, width = 96, danger = false }: Props) {
  const c = useColors();
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      setReduceMotion(r);
      if (!r) startWave();
    });
  }, []);

  const zipH = width * 0.26;
  const bodyW = width * 0.76;
  const bodyH = width * 1.08;
  const radius = width * 0.16;
  const fill = Math.max(0, Math.min(grams / FULL_BAG_GRAMS, 1));
  const liquidH = fill * (bodyH - 8);
  const amp = Math.max(2, width * 0.035);
  const period = bodyW / 2;
  const waveW = bodyW + period * 2;
  const translateX = wave.interpolate({ inputRange: [0, 1], outputRange: [0, -period] });

  return (
    <View style={{ width, alignItems: 'center' }} accessible={false}>
      {/* zip strip with the peg hole */}
      <View
        style={[
          styles.zip,
          { width: width * 0.84, height: zipH, backgroundColor: c.zip, borderColor: c.bagStroke },
        ]}
      >
        <View style={[styles.hole, { backgroundColor: c.boardHole, width: zipH * 0.42, height: zipH * 0.42, borderRadius: zipH }]}>
          <View style={{ backgroundColor: c.peg, width: zipH * 0.24, height: zipH * 0.24, borderRadius: zipH }} />
        </View>
        <View style={[styles.zipLine, { backgroundColor: c.zipLine }]} />
      </View>
      {/* clear bag body */}
      <View
        style={{
          width: bodyW,
          height: bodyH,
          marginTop: -1,
          borderWidth: danger ? 2.5 : 1.5,
          borderColor: danger ? c.danger : c.bagStroke,
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius,
          backgroundColor: c.film,
          overflow: 'hidden',
        }}
      >
        {liquidH > 0 && (
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: liquidH, backgroundColor: c.liquid }}>
            <Animated.View
              style={{
                position: 'absolute',
                top: -amp * 2 + 1,
                left: 0,
                width: waveW,
                height: amp * 2,
                transform: [{ translateX: reduceMotion ? 0 : translateX }],
              }}
            >
              <Svg width={waveW} height={amp * 2}>
                <Path d={wavePath(waveW, period, amp, amp * 2)} fill={c.liquid} />
              </Svg>
            </Animated.View>
          </View>
        )}
        <View style={[styles.shine, { height: bodyH * 0.7 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zip: { borderWidth: 1.5, borderRadius: 3, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  hole: { alignItems: 'center', justifyContent: 'center', marginTop: -4 },
  zipLine: { position: 'absolute', left: 3, right: 3, bottom: 4, height: 2 },
  shine: { position: 'absolute', left: 6, top: 8, width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
});
