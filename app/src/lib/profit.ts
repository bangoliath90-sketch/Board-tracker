import type { Bag, StockEntry } from './types';

/**
 * Average cost per gram across restocks where you entered what you paid.
 * Adjustments (losses, corrections) don't change the cost per gram.
 */
export function costPerGram(stock: StockEntry[]): number | null {
  return averageCost(stock, 'grams');
}

/** Average cost per unit across unit restocks where you entered what you paid. */
export function costPerUnit(stock: StockEntry[]): number | null {
  return averageCost(stock, 'unit');
}

function averageCost(stock: StockEntry[], item: 'grams' | 'unit'): number | null {
  let grams = 0;
  let cost = 0;
  for (const s of stock) {
    if ((s.item ?? 'grams') === item && s.kind === 'restock' && s.cost != null && s.grams > 0) {
      grams += s.grams;
      cost += s.cost;
    }
  }
  return grams > 0 ? cost / grams : null;
}

export function bagProfit(bag: Pick<Bag, 'grams' | 'price' | 'item'>, cpg: number | null, cpu: number | null = null) {
  const cost = bag.item === 'unit' ? cpu : cpg == null ? null : bag.grams * cpg;
  if (cost == null) return null;
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

const inRange = (iso: string | null | undefined, r: { start: Date | null; end: Date | null }) => {
  if (!iso) return false;
  // A plain YYYY-MM-DD date means that local day, not midnight UTC.
  const t = (iso.length === 10 ? new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) : new Date(iso)).getTime();
  return (!r.start || t >= r.start.getTime()) && (!r.end || t < r.end.getTime());
};

export type Summary = {
  bagsSold: number;
  gramsSold: number;
  unitsSold: number;
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
  /** Grams lost from stock or the board, and written-off bags. */
  lostGrams: number;
  /** Units lost from the box, and written-off units. */
  lostUnits: number;
  /** Money owed that was written off as never paid. */
  writtenOff: number;
  /** What the lost product cost you; null if a cost is unknown. */
  lossCost: number | null;
};

export function summarize(
  bags: Bag[],
  cpg: number | null,
  r: { start: Date | null; end: Date | null },
  cpu: number | null = null,
  stock: StockEntry[] = [],
): Summary {
  let bagsSold = 0, gramsSold = 0, unitsSold = 0, sales = 0, gramSales = 0, collected = 0, stillOwed = 0;
  for (const b of bags) {
    if ((b.status === 'taken' || b.status === 'paid') && inRange(b.taken_at, r)) {
      if (b.item === 'unit') unitsSold += 1;
      else {
        bagsSold += 1;
        gramsSold += b.grams;
        gramSales += b.price;
      }
      sales += b.price;
      if (b.status === 'taken') stillOwed += b.price;
    }
    if (b.status === 'paid' && inRange(b.paid_at, r)) collected += b.price;
  }
  // Losses: stock loss entries, plus taken items written off as never paid.
  let lostGrams = 0, lostUnits = 0, writtenOff = 0;
  for (const s of stock) {
    if (s.kind === 'loss' && inRange(s.entry_date, r)) {
      if (s.item === 'unit') lostUnits += -s.grams;
      else lostGrams += -s.grams;
    }
  }
  for (const b of bags) {
    if (b.status === 'lost' && inRange(b.lost_at, r)) {
      if (b.item === 'unit') lostUnits += 1;
      else lostGrams += b.grams;
      writtenOff += b.price;
    }
  }
  const lossGramCost = lostGrams > 0 ? (cpg == null ? null : lostGrams * cpg) : 0;
  const lossUnitCost = lostUnits > 0 ? (cpu == null ? null : lostUnits * cpu) : 0;
  const lossCost = lossGramCost == null || lossUnitCost == null ? null : lossGramCost + lossUnitCost;

  // Cost is known only if every kind of item sold has a known cost.
  const gramCost = gramsSold > 0 ? (cpg == null ? null : gramsSold * cpg) : 0;
  const unitCost = unitsSold > 0 ? (cpu == null ? null : unitsSold * cpu) : 0;
  const cost = gramCost == null || unitCost == null || (cpg == null && cpu == null) ? null : gramCost + unitCost;
  const profit = cost == null || lossCost == null ? null : sales - cost - lossCost;
  return {
    bagsSold,
    gramsSold,
    unitsSold,
    sales,
    cost,
    profit,
    margin: profit != null && sales > 0 ? profit / sales : null,
    collected,
    stillOwed,
    pricePerGram: gramsSold > 0 ? gramSales / gramsSold : null,
    lostGrams,
    lostUnits,
    writtenOff,
    lossCost,
  };
}

/** Sales and profit for each of the last `weeks` weeks, oldest first. */
export function weekly(bags: Bag[], cpg: number | null, weeks = 8, now = new Date(), cpu: number | null = null, stock: StockEntry[] = []) {
  const thisWeek = startOfWeek(now);
  const out: { start: Date; sales: number; profit: number | null }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - 7 * i);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const s = summarize(bags, cpg, { start, end }, cpu, stock);
    out.push({ start, sales: s.sales, profit: s.profit });
  }
  return out;
}
