-- Adds product loss records and written-off bags/units.
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run more than once.

-- Inventory log entries can now be losses (stored as negative grams or units).
alter table public.stock_entries drop constraint if exists stock_entries_kind_check;
alter table public.stock_entries add constraint stock_entries_kind_check check (kind in ('restock', 'adjust', 'loss'));
alter table public.stock_entries drop constraint if exists stock_entries_check;
alter table public.stock_entries drop constraint if exists stock_entries_sign_check;
alter table public.stock_entries add constraint stock_entries_sign_check
  check ((kind <> 'restock' or grams > 0) and (kind <> 'loss' or grams < 0));

-- A taken bag or unit that will never be paid can be written off as lost.
alter table public.bags drop constraint if exists bags_status_check;
alter table public.bags add constraint bags_status_check check (status in ('on_board', 'taken', 'paid', 'lost'));
alter table public.bags add column if not exists lost_at timestamptz;

-- Written-off (lost) bags count as gone from on-hand grams.
create or replace view public.board_totals with (security_invoker = true) as
select
  b.id as board_id,
  coalesce(s.stock_grams, 0) - coalesce(x.out_grams, 0)                              as on_hand_grams,
  coalesce(x.board_grams, 0)                                                         as on_board_grams,
  coalesce(s.stock_grams, 0) - coalesce(x.out_grams, 0) - coalesce(x.board_grams, 0) as available_grams,
  coalesce(x.out_grams, 0)                                                           as given_out_grams,
  coalesce(x.owed, 0)                                                                as owed,
  coalesce(x.collected, 0)                                                           as collected
from public.boards b
left join (
  select board_id, sum(grams) as stock_grams
  from public.stock_entries where item = 'grams' group by board_id
) s on s.board_id = b.id
left join (
  select board_id,
    sum(grams) filter (where item = 'grams' and status <> 'on_board')      as out_grams,
    sum(grams) filter (where item = 'grams' and status = 'on_board')         as board_grams,
    sum(price) filter (where status = 'taken')                               as owed,
    sum(price) filter (where status = 'paid')                                as collected
  from public.bags group by board_id
) x on x.board_id = b.id;
