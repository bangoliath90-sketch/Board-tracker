export type BagStatus = 'on_board' | 'taken' | 'paid';

export type Board = { id: string; name: string; invite_code: string };
export type Member = { board_id: string; user_id: string; display_name: string };
export type Preset = { grams: number; default_price: number };
export type Person = { id: string; board_id: string; name: string; notes: string | null };

export type Bag = {
  id: string;
  board_id: string;
  grams: number;
  price: number;
  status: BagStatus;
  person_id: string | null;
  taken_at: string | null;
  due_date: string | null; // YYYY-MM-DD
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

export type StockEntry = {
  id: string;
  board_id: string;
  kind: 'restock' | 'adjust';
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
