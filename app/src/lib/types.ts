export type BagStatus = 'on_board' | 'taken' | 'paid';
/** 'grams' = a liquid bag on the pegboard; 'unit' = one item in the units box. */
export type ItemKind = 'grams' | 'unit';

export type Board = {
  id: string;
  name: string;
  invite_code: string;
  reminder_days?: number;
  reminder_template?: string;
  unit_price?: number;
  unit_capacity?: number;
};
export type Member = { board_id: string; user_id: string; display_name: string };
export type Preset = { grams: number; default_price: number };
export type Person = { id: string; board_id: string; name: string; notes: string | null; phone?: string | null };

export type Bag = {
  id: string;
  board_id: string;
  item: ItemKind;
  /** Grams in a bag; 0 for units. */
  grams: number;
  price: number;
  status: BagStatus;
  person_id: string | null;
  taken_at: string | null;
  due_date: string | null; // YYYY-MM-DD
  paid_at: string | null;
  notes: string | null;
  reminded_at?: string | null;
  created_at: string;
};

export type StockEntry = {
  id: string;
  board_id: string;
  kind: 'restock' | 'adjust';
  item: ItemKind;
  /** Grams, or the number of units for unit restocks. */
  grams: number;
  cost: number | null;
  note: string | null;
  entry_date: string; // YYYY-MM-DD
  created_at: string;
};

export type Totals = {
  onHand: number;
  onBoard: number;
  available: number;
  givenOut: number;
  owed: number;
  collected: number;
};
