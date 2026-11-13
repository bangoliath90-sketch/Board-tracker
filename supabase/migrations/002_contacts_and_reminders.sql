-- Adds phone numbers for people and text-reminder settings.
-- Paste into Supabase: SQL Editor -> New query -> Run. Safe to run more than once.

alter table public.people add column if not exists phone text;

alter table public.boards add column if not exists reminder_days integer not null default 1
  check (reminder_days between 0 and 365);
alter table public.boards add column if not exists reminder_template text not null
  default 'Hi {name}, just a reminder that {amount} was due on {due}. Thanks!';

-- When someone last opened a text reminder for this bag.
alter table public.bags add column if not exists reminded_at timestamptz;
