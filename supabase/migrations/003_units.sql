-- Adds "units": items counted one by one (kept in a box of up to 75), separate from grams.
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run more than once.

-- Bags and units share one table. A unit has item = 'unit' and no grams.
alter table public.bags add column if not exists item text not null default 'grams';
alter table public.bags drop constraint if exists bags_item_check;
alter table public.bags add constraint bags_item_check check (item in ('grams', 'unit'));
alter table public.bags alter column grams drop not null;
alter table public.bags drop constraint if exists bags_grams_check;
alter table public.bags drop constraint if exists bags_grams_item_check;
alter table public.bags add constraint bags_grams_item_check
  check ((item = 'grams' and grams is not null and grams > 0) or (item = 'unit' and grams is null));

-- Restocks of units record the number of units in the grams column.
alter table public.stock_entries add column if not exists item text not null default 'grams';
alter table public.stock_entries drop constraint if exists stock_entries_item_check;
alter table public.stock_entries add constraint stock_entries_item_check check (item in ('grams', 'unit'));

-- Default unit price and box size.
alter table public.boards add column if not exists unit_price numeric(10,2) not null default 30 check (unit_price >= 0);
alter table public.boards add column if not exists unit_capacity integer not null default 75 check (unit_capacity between 1 and 500);

-- Gram totals ignore units; money totals include both.
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
    sum(grams) filter (where item = 'grams' and status in ('taken', 'paid')) as out_grams,
    sum(grams) filter (where item = 'grams' and status = 'on_board')         as board_grams,
    sum(price) filter (where status = 'taken')                               as owed,
    sum(price) filter (where status = 'paid')                                as collected
  from public.bags group by board_id
) x on x.board_id = b.id;
