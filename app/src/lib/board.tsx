import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './auth';
import { computeTotals, round1 } from './format';
import { supabase } from './supabase';
import type { Bag, Board, Member, Person, Preset, StockEntry, Totals } from './types';

type Status = 'loading' | 'none' | 'ready' | 'error';
type Table = 'boards' | 'board_members' | 'presets' | 'people' | 'bags' | 'stock_entries';

export type TakeInput = {
  personId?: string;
  newPersonName?: string;
  /** Phone for a new person, or to fill in for an existing person who has none. */
  phone?: string | null;
  price: number;
  paid: boolean;
  dueDate: string | null;
  notes: string;
};

type BoardState = {
  status: Status;
  error: string | null;
  board: Board | null;
  members: Member[];
  presets: Preset[];
  people: Person[];
  bags: Bag[];
  stock: StockEntry[];
  totals: Totals;
  personName: (id: string | null) => string;
  reload: () => Promise<void>;
  createBoard: (name: string, displayName: string) => Promise<void>;
  joinBoard: (code: string, displayName: string) => Promise<void>;
  hangBags: (grams: number, price: number, count: number) => Promise<void>;
  takeBag: (bagId: string, input: TakeInput) => Promise<{ personName: string }>;
  markPaid: (bagId: string) => Promise<void>;
  markUnpaid: (bagId: string) => Promise<void>;
  undoTake: (bagId: string) => Promise<void>;
  removeBag: (bagId: string) => Promise<void>;
  setDueDate: (bagId: string, dueDate: string | null) => Promise<void>;
  addPerson: (name: string, phone?: string | null) => Promise<string>;
  updatePerson: (id: string, fields: { name: string; phone: string | null }) => Promise<void>;
  saveReminderSettings: (days: number, template: string) => Promise<void>;
  updateBag: (bagId: string, fields: { grams: number; price: number; personId?: string; notes: string }) => Promise<void>;
  deletePerson: (id: string) => Promise<void>;
  updateStock: (id: string, fields: { grams: number; cost: number | null; note: string; date: string }) => Promise<void>;
  deleteStock: (id: string) => Promise<void>;
  markReminded: (bagId: string) => Promise<void>;
  addStock: (entry: { kind: 'restock' | 'adjust'; grams: number; cost: number | null; note: string; date: string }) => Promise<void>;
  savePresets: (presets: Preset[]) => Promise<void>;
  leaveBoard: () => Promise<void>;
};

const BoardContext = createContext<BoardState | null>(null);

/** Throw a readable error if Supabase returned one. */
function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const num = (v: unknown) => (v == null ? 0 : Number(v));
const toBag = (r: any): Bag => ({ ...r, grams: num(r.grams), price: num(r.price) });
const toStock = (r: any): StockEntry => ({ ...r, grams: num(r.grams), cost: r.cost == null ? null : num(r.cost) });
const toPreset = (r: any): Preset => ({ grams: num(r.grams), default_price: num(r.default_price) });

export function BoardProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [bags, setBags] = useState<Bag[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const boardIdRef = useRef<string | null>(null);

  const fetchTable = useCallback(async (table: Table, boardId: string) => {
    switch (table) {
      case 'boards': {
        const data = check(await supabase.from('boards').select('*').eq('id', boardId).single());
        setBoard(data as Board);
        break;
      }
      case 'board_members': {
        const data = check(await supabase.from('board_members').select('board_id,user_id,display_name').eq('board_id', boardId).order('joined_at'));
        setMembers(data as Member[]);
        break;
      }
      case 'presets': {
        const data = check(await supabase.from('presets').select('grams,default_price').eq('board_id', boardId).order('grams'));
        setPresets((data ?? []).map(toPreset));
        break;
      }
      case 'people': {
        const data = check(await supabase.from('people').select('*').eq('board_id', boardId).order('name'));
        setPeople(data as Person[]);
        break;
      }
      case 'bags': {
        const data = check(await supabase.from('bags').select('*').eq('board_id', boardId).order('created_at'));
        setBags((data ?? []).map(toBag));
        break;
      }
      case 'stock_entries': {
        const data = check(await supabase.from('stock_entries').select('*').eq('board_id', boardId).order('entry_date', { ascending: false }).order('created_at', { ascending: false }));
        setStock((data ?? []).map(toStock));
        break;
      }
    }
  }, []);

  const refresh = useCallback(
    async (...tables: Table[]) => {
      const id = boardIdRef.current;
      if (!id) return;
      await Promise.all(tables.map((t) => fetchTable(t, id)));
    },
    [fetchTable],
  );

  const reload = useCallback(async () => {
    if (!userId) {
      boardIdRef.current = null;
      setBoard(null);
      setStatus('none');
      return;
    }
    try {
      setError(null);
      const rows = check(
        await supabase.from('board_members').select('board_id').eq('user_id', userId).order('joined_at').limit(1),
      );
      const id = rows?.[0]?.board_id as string | undefined;
      if (!id) {
        boardIdRef.current = null;
        setBoard(null);
        setStatus('none');
        return;
      }
      boardIdRef.current = id;
      await Promise.all(
        (['boards', 'board_members', 'presets', 'people', 'bags', 'stock_entries'] as Table[]).map((t) => fetchTable(t, id)),
      );
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [userId, fetchTable]);

  useEffect(() => {
    setStatus('loading');
    reload();
  }, [reload]);

  // Live sync: when anyone on the board changes something, re-read that table.
  const boardId = board?.id ?? null;
  useEffect(() => {
    if (!boardId) return;
    const filter = `board_id=eq.${boardId}`;
    let channel = supabase.channel(`board-${boardId}`);
    for (const table of ['bags', 'people', 'stock_entries', 'presets', 'board_members'] as Table[]) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, () => {
        refresh(table).catch(() => {});
      });
    }
    channel.subscribe();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') reload();
    });
    return () => {
      supabase.removeChannel(channel);
      sub.remove();
    };
  }, [boardId, refresh, reload]);

  const totals = useMemo(() => computeTotals(bags, stock), [bags, stock]);
  const personName = useCallback((id: string | null) => people.find((p) => p.id === id)?.name ?? 'Someone', [people]);

  const requireBoard = () => {
    if (!boardIdRef.current) throw new Error('No board selected');
    return boardIdRef.current;
  };

  const value: BoardState = {
    status,
    error,
    board,
    members,
    presets,
    people,
    bags,
    stock,
    totals,
    personName,
    reload,

    async createBoard(name, displayName) {
      check(await supabase.rpc('create_board', { p_name: name, p_display_name: displayName }));
      await reload();
    },

    async joinBoard(code, displayName) {
      check(await supabase.rpc('join_board', { p_code: code, p_display_name: displayName }));
      await reload();
    },

    async hangBags(g, price, count) {
      const id = requireBoard();
      const rows = Array.from({ length: count }, () => ({ board_id: id, grams: round1(g), price }));
      check(await supabase.from('bags').insert(rows));
      await refresh('bags');
    },

    async takeBag(bagId, input) {
      const id = requireBoard();
      let personId = input.personId;
      let name = personId ? personName(personId) : '';
      const phone = input.phone?.trim() || null;
      if (personId && phone && !people.find((p) => p.id === personId)?.phone) {
        check(await supabase.from('people').update({ phone }).eq('id', personId));
      }
      if (!personId) {
        const newName = (input.newPersonName ?? '').trim();
        if (!newName) throw new Error('Choose who grabbed the bag.');
        const existing = people.find((p) => p.name.toLowerCase() === newName.toLowerCase());
        if (existing) {
          personId = existing.id;
          name = existing.name;
          if (phone && !existing.phone) check(await supabase.from('people').update({ phone }).eq('id', existing.id));
        } else {
          const row = check(
            await supabase
              .from('people')
              .insert(phone ? { board_id: id, name: newName, phone } : { board_id: id, name: newName })
              .select('id')
              .single(),
          );
          personId = (row as { id: string }).id;
          name = newName;
        }
      }
      const now = new Date().toISOString();
      const updated = check(
        await supabase
          .from('bags')
          .update({
            status: input.paid ? 'paid' : 'taken',
            person_id: personId,
            price: input.price,
            taken_at: now,
            paid_at: input.paid ? now : null,
            due_date: input.paid ? null : input.dueDate,
            notes: input.notes.trim() || null,
          })
          .eq('id', bagId)
          .eq('status', 'on_board')
          .select('id'),
      );
      await refresh('bags', 'people');
      if (!updated || updated.length === 0) throw new Error('Someone else already took this bag.');
      return { personName: name };
    },

    async markPaid(bagId) {
      check(await supabase.from('bags').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', bagId));
      await refresh('bags');
    },

    async markUnpaid(bagId) {
      check(await supabase.from('bags').update({ status: 'taken', paid_at: null }).eq('id', bagId));
      await refresh('bags');
    },

    async undoTake(bagId) {
      check(
        await supabase
          .from('bags')
          .update({ status: 'on_board', person_id: null, taken_at: null, paid_at: null, due_date: null, reminded_at: null })
          .eq('id', bagId),
      );
      await refresh('bags');
    },

    async removeBag(bagId) {
      check(await supabase.from('bags').delete().eq('id', bagId).eq('status', 'on_board'));
      await refresh('bags');
    },

    async setDueDate(bagId, dueDate) {
      check(await supabase.from('bags').update({ due_date: dueDate }).eq('id', bagId));
      await refresh('bags');
    },

    async addPerson(name, phone) {
      const id = requireBoard();
      const p = phone?.trim();
      const row = check(
        await supabase
          .from('people')
          .insert(p ? { board_id: id, name: name.trim(), phone: p } : { board_id: id, name: name.trim() })
          .select('id')
          .single(),
      );
      await refresh('people');
      return (row as { id: string }).id;
    },

    async updatePerson(personId, fields) {
      check(
        await supabase
          .from('people')
          .update({ name: fields.name.trim(), phone: fields.phone?.trim() || null })
          .eq('id', personId),
      );
      await refresh('people');
    },

    async saveReminderSettings(days, template) {
      const id = requireBoard();
      check(await supabase.from('boards').update({ reminder_days: days, reminder_template: template.trim() }).eq('id', id));
      await refresh('boards');
    },

    async updateBag(bagId, fields) {
      const update: Record<string, unknown> = {
        grams: round1(fields.grams),
        price: fields.price,
        notes: fields.notes.trim() || null,
      };
      if (fields.personId) update.person_id = fields.personId;
      check(await supabase.from('bags').update(update).eq('id', bagId));
      await refresh('bags');
    },

    async deletePerson(personId) {
      if (bags.some((b) => b.person_id === personId && b.status !== 'on_board')) {
        throw new Error('This person has bags in Owed or History, so they can\'t be deleted.');
      }
      check(await supabase.from('people').delete().eq('id', personId));
      await refresh('people');
    },

    async updateStock(id, fields) {
      check(
        await supabase
          .from('stock_entries')
          .update({ grams: round1(fields.grams), cost: fields.cost, note: fields.note.trim() || null, entry_date: fields.date })
          .eq('id', id),
      );
      await refresh('stock_entries');
    },

    async deleteStock(id) {
      check(await supabase.from('stock_entries').delete().eq('id', id));
      await refresh('stock_entries');
    },

    async markReminded(bagId) {
      check(await supabase.from('bags').update({ reminded_at: new Date().toISOString() }).eq('id', bagId));
      await refresh('bags');
    },

    async addStock(entry) {
      const id = requireBoard();
      check(
        await supabase.from('stock_entries').insert({
          board_id: id,
          kind: entry.kind,
          grams: round1(entry.grams),
          cost: entry.cost,
          note: entry.note.trim() || null,
          entry_date: entry.date,
        }),
      );
      await refresh('stock_entries');
    },

    async savePresets(list) {
      const id = requireBoard();
      check(
        await supabase
          .from('presets')
          .upsert(list.map((p) => ({ board_id: id, grams: p.grams, default_price: p.default_price })), {
            onConflict: 'board_id,grams',
          }),
      );
      await refresh('presets');
    },

    async leaveBoard() {
      const id = requireBoard();
      if (!userId) return;
      check(await supabase.from('board_members').delete().eq('board_id', id).eq('user_id', userId));
      await reload();
    },
  };

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>;
}

export function useBoard(): BoardState {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('useBoard must be used inside BoardProvider');
  return ctx;
}
