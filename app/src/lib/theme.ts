import { Platform, useColorScheme } from 'react-native';

const light = {
  bg: '#E8EBEE',
  surface: '#FFFFFF',
  surface2: '#F3F5F7',
  ink: '#1B2027',
  muted: '#5C6773',
  line: '#D3D9DF',
  accent: '#0C7F6E',
  accentInk: '#FFFFFF',
  liquid: '#1AAE96',
  liquidDeep: '#0B6F61',
  board: '#C79E70',
  boardHole: '#6F4E30',
  boardFrame: '#8A6340',
  film: 'rgba(255,255,255,0.62)',
  bagStroke: '#7E8B97',
  zip: '#DDE3E8',
  zipLine: '#A9B4BE',
  peg: '#B8C0C8',
  ok: '#24804F',
  okBg: '#DDF2E5',
  warn: '#9A5B00',
  warnBg: '#FCEFD3',
  danger: '#B8392A',
  dangerBg: '#FBE1DC',
};

const dark: typeof light = {
  bg: '#101419',
  surface: '#1A2027',
  surface2: '#222932',
  ink: '#E6EBF0',
  muted: '#97A3AF',
  line: '#2E3740',
  accent: '#2CC4AA',
  accentInk: '#06211C',
  liquid: '#27C2A7',
  liquidDeep: '#11806F',
  board: '#6E5235',
  boardHole: '#2E2114',
  boardFrame: '#4A3522',
  film: 'rgba(255,255,255,0.22)',
  bagStroke: '#AAB5C0',
  zip: '#3A444E',
  zipLine: '#5A6672',
  peg: '#8D98A3',
  ok: '#5FD08F',
  okBg: '#16301F',
  warn: '#F2B24C',
  warnBg: '#35280F',
  danger: '#FF7A66',
  dangerBg: '#3A1A15',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}

export const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
