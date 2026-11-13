import type { Bag, StockEntry } from './types';

/**
 * Average cost per gram across restocks where you entered what you paid.
 * Adjustments (losses, corrections) don't change the cost per gram.
 */
export function costPerGram(stock: StockEntry[]): number | null {
  let grams = 0;
  let cost = 0;
  for (const s of stock) {
    if (s.kind === 'restock' && s.cost != null && s.grams > 0) {
      grams += s.grams;
      cost += s.cost;
    }
  }
  return grams > 0 ? cost / grams : null;
}

export function bagProfit(bag: Pick<Bag, 'grams' | 'price'>, cpg: number | null) {
  if (cpg == null) return null;
  const cost = bag.grams * cpg;
  return { cost, profit: bag.price - cost };
}

export type Period = 'week' | 'month' | 'last-month' | 'all';
export const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'all', label: 'All time' },
];

/** Weeks start on Monday. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function periodRange(p: Period, now = new Date()): { start: Date | null; end: Date | null } {
  if (p === 'all') return { start: null, end: null };
  if (p === 'week') return { start: startOfWeek(now), end: null };
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === 'month') return { start: first, end: null };
  return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: first };
}

const inRange = (iso: string | null, r: { start: Date | null; end: Date | null }) => {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return (!r.start || t >= r.start.getTime()) && (!r.end || t < r.end.getTime());
};

export type Summary = {
  bagsSold: number;
  gramsSold: number;
  /** Price of every bag taken in the period, paid or not. */
  sales: number;
  cost: number | null;
  profit: number | null;
  /** Profit as a share of sales, 0..1. */
  margin: number | null;
  /** Money actually received in the period (bags marked paid). */
  collected: number;
  /** Bags taken in the period that are still unpaid. */
  stillOwed: number;
  pricePerGram: number | null;
};

export function summarize(bags: Bag[], cpg: number | null, r: { start: Date | null; end: Date | null }): Summary {
  let bagsSold = 0, gramsSold = 0, sales = 0, collected = 0, stillOwed = 0;
  for (const b of bags) {
    if (b.status !== 'on_board' && inRange(b.taken_at, r)) {
      bagsSold += 1;
      gramsSold += b.grams;
      sales += b.price;
      if (b.status === 'taken') stillOwed += b.price;
    }
    if (b.status === 'paid' && inRange(b.paid_at, r)) collected += b.price;
  }
  const cost = cpg == null ? null : gramsSold * cpg;
  const profit = cost == null ? null : sales - cost;
  return {
    bagsSold,
    gramsSold,
    sales,
    cost,
    profit,
    margin: profit != null && sales > 0 ? profit / sales : null,
    collected,
    stillOwed,
    pricePerGram: gramsSold > 0 ? sales / gramsSold : null,
  };
}

/** Sales and profit for each of the last `weeks` weeks, oldest first. */
export function weekly(bags: Bag[], cpg: number | null, weeks = 8, now = new Date()) {
  const thisWeek = startOfWeek(now);
  const out: { start: Date; sales: number; profit: number | null }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - 7 * i);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const s = summarize(bags, cpg, { start, end });
    out.push({ start, sales: s.sales, profit: s.profit });
  }
  return out;
}
