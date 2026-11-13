-- Board Tracker database setup
-- Paste this whole file into Supabase: SQL Editor -> New query -> Run.
-- It is safe to run once on a new, empty project.

-- ---------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------

create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'My board',
  invite_code text not null unique,
  created_by  uuid not null default auth.uid() references auth.users (id),
  created_at  timestamptz not null default now()
);

create table public.board_members (
  board_id     uuid not null references public.boards (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index board_members_user_idx on public.board_members (user_id);

-- Preset bag sizes and their default prices (USD).
create table public.presets (
  board_id      uuid not null references public.boards (id) on delete cascade,
  grams         numeric(10,2) not null check (grams > 0),
  default_price numeric(10,2) not null check (default_price >= 0),
  primary key (board_id, grams)
);

-- People who take bags.
create table public.people (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  notes      text,
  created_at timestamptz not null default now()
);
create index people_board_idx on public.people (board_id);

-- Bags. Grams leave the inventory when status becomes 'taken' or 'paid'.
create table public.bags (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  grams      numeric(10,2) not null check (grams > 0),
  price      numeric(10,2) not null check (price >= 0),
  status     text not null default 'on_board' check (status in ('on_board', 'taken', 'paid')),
  person_id  uuid references public.people (id) on delete set null,
  taken_at   timestamptz,
  due_date   date,
  paid_at    timestamptz,
  notes      text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A taken or paid bag must say who took it and when.
  check (status = 'on_board' or (person_id is not null and taken_at is not null)),
  check (status <> 'paid' or paid_at is not null)
);
create index bags_board_status_idx on public.bags (board_id, status);
create index bags_due_idx on public.bags (due_date) where status = 'taken';

-- Restocks (positive grams) and adjustments (positive or negative grams).
create table public.stock_entries (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references public.boards (id) on delete cascade,
  kind       text not null check (kind in ('restock', 'adjust')),
  grams      numeric(10,2) not null check (grams <> 0),
  cost       numeric(10,2) check (cost >= 0),
  note       text,
  entry_date date not null default current_date,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (kind = 'adjust' or grams > 0)
);
create index stock_entries_board_idx on public.stock_entries (board_id);

-- Phone push-notification tokens, used for due-date reminders.
create table public.push_tokens (
  token      text primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  platform   text check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

-- Keep bags.updated_at current.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger bags_touch before update on public.bags
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- Totals for the top of the board
-- ---------------------------------------------------------------

create view public.board_totals with (security_invoker = true) as
select
  b.id as board_id,
  coalesce(s.stock_grams, 0) - coalesce(x.out_grams, 0)                          as on_hand_grams,
  coalesce(x.board_grams, 0)                                                     as on_board_grams,
  coalesce(s.stock_grams, 0) - coalesce(x.out_grams, 0) - coalesce(x.board_grams, 0) as available_grams,
  coalesce(x.out_grams, 0)                                                       as given_out_grams,
  coalesce(x.owed, 0)                                                            as owed,
  coalesce(x.collected, 0)                                                       as collected
from public.boards b
left join (
  select board_id, sum(grams) as stock_grams
  from public.stock_entries group by board_id
) s on s.board_id = b.id
left join (
  select board_id,
    sum(grams) filter (where status in ('taken', 'paid')) as out_grams,
    sum(grams) filter (where status = 'on_board')         as board_grams,
    sum(price) filter (where status = 'taken')            as owed,
    sum(price) filter (where status = 'paid')             as collected
  from public.bags group by board_id
) x on x.board_id = b.id;

-- ---------------------------------------------------------------
-- Access rules: only members of a board can see or change it.
-- Every member has equal access.
-- ---------------------------------------------------------------

create function public.is_board_member(p_board uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.board_members
    where board_id = p_board and user_id = auth.uid()
  );
$$;

alter table public.boards        enable row level security;
alter table public.board_members enable row level security;
alter table public.presets       enable row level security;
alter table public.people        enable row level security;
alter table public.bags          enable row level security;
alter table public.stock_entries enable row level security;
alter table public.push_tokens   enable row level security;

-- Boards are created through create_board() and joined through join_board().
create policy "members read board"   on public.boards for select to authenticated using (public.is_board_member(id));
create policy "members update board" on public.boards for update to authenticated using (public.is_board_member(id)) with check (public.is_board_member(id));
create policy "members delete board" on public.boards for delete to authenticated using (public.is_board_member(id));

create policy "members see members" on public.board_members for select to authenticated using (public.is_board_member(board_id));
create policy "rename yourself"     on public.board_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "leave a board"       on public.board_members for delete to authenticated using (user_id = auth.uid());

create policy "members manage presets" on public.presets       for all to authenticated using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));
create policy "members manage people"  on public.people        for all to authenticated using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));
create policy "members manage bags"    on public.bags          for all to authenticated using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));
create policy "members manage stock"   on public.stock_entries for all to authenticated using (public.is_board_member(board_id)) with check (public.is_board_member(board_id));

create policy "own push tokens" on public.push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A bag's person must belong to the same board.
create function public.check_bag_person() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.person_id is not null and not exists (
    select 1 from public.people where id = new.person_id and board_id = new.board_id
  ) then
    raise exception 'That person is not on this board';
  end if;
  return new;
end $$;
create trigger bags_person_check before insert or update on public.bags
  for each row execute function public.check_bag_person();

-- ---------------------------------------------------------------
-- Create a board, or join one with an invite code
-- ---------------------------------------------------------------

create function public.create_board(p_name text, p_display_name text)
returns public.boards
language plpgsql security definer set search_path = '' as $$
declare
  v_board public.boards;
  v_code  text;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;

  loop
    -- e.g. PEG-7KQ4MX (no 0/O or 1/I so it is easy to read out loud)
    select 'PEG-' || string_agg(substr('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 32)::int, 1), '')
      into v_code
      from generate_series(1, 6);
    exit when not exists (select 1 from public.boards where invite_code = v_code);
  end loop;

  insert into public.boards (name, invite_code, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'My board'), v_code, auth.uid())
  returning * into v_board;

  insert into public.board_members (board_id, user_id, display_name)
  values (v_board.id, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Me'));

  insert into public.presets (board_id, grams, default_price) values
    (v_board.id, 2, 20), (v_board.id, 4, 40), (v_board.id, 6, 60),
    (v_board.id, 7, 70), (v_board.id, 14, 100), (v_board.id, 28, 150);

  return v_board;
end $$;

create function public.join_board(p_code text, p_display_name text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_board uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;

  select id into v_board from public.boards
  where invite_code = upper(trim(p_code));

  if v_board is null then
    raise exception 'No board has that invite code';
  end if;

  insert into public.board_members (board_id, user_id, display_name)
  values (v_board, auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Member'))
  on conflict (board_id, user_id) do nothing;

  return v_board;
end $$;

revoke execute on function public.create_board(text, text) from public, anon;
revoke execute on function public.join_board(text, text)   from public, anon;
grant  execute on function public.create_board(text, text) to authenticated;
grant  execute on function public.join_board(text, text)   to authenticated;

-- ---------------------------------------------------------------
-- Live sync: phones get changes to these tables instantly.
-- ---------------------------------------------------------------

alter publication supabase_realtime add table
  public.bags, public.people, public.stock_entries, public.presets, public.board_members;
