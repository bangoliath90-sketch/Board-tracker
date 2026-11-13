import type { Bag, StockEntry, Totals } from './types';

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function grams(n: number): string {
  return `${round1(n).toLocaleString('en-US')} g`;
}

export function usd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: n % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

/** Local calendar date as YYYY-MM-DD. */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(n: number): string {
  const d = startOfToday();
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

/** Whole days from today until the date (negative = in the past). */
export function daysUntil(date: string): number {
  return Math.round((parseDate(date).getTime() - startOfToday().getTime()) / 86_400_000);
}

export function shortDate(value: string): string {
  // Accepts YYYY-MM-DD or a full timestamp.
  const d = value.length === 10 ? parseDate(value) : new Date(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export type DueTone = 'none' | 'soon' | 'late';

export function dueInfo(bag: Pick<Bag, 'due_date'>): { label: string; tone: DueTone } {
  if (!bag.due_date) return { label: 'No due date', tone: 'none' };
  const d = daysUntil(bag.due_date);
  if (d < 0) return { label: `${-d} day${d === -1 ? '' : 's'} overdue`, tone: 'late' };
  if (d === 0) return { label: 'Due today', tone: 'soon' };
  if (d === 1) return { label: 'Due tomorrow', tone: 'soon' };
  return { label: `Due ${shortDate(bag.due_date)}`, tone: d <= 3 ? 'soon' : 'none' };
}

export function computeTotals(bags: Bag[], stock: StockEntry[]): Totals {
  let stockGrams = 0;
  for (const s of stock) stockGrams += s.grams;
  let out = 0, onBoard = 0, owed = 0, collected = 0;
  for (const b of bags) {
    if (b.status === 'on_board') onBoard += b.grams;
    else out += b.grams;
    if (b.status === 'taken') owed += b.price;
    if (b.status === 'paid') collected += b.price;
  }
  const onHand = stockGrams - out;
  return { onHand, onBoard, available: onHand - onBoard, givenOut: out, owed, collected };
}

/** Turn a typed number like "7", "7.5" or "$70" into a number, or null. */
export function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
