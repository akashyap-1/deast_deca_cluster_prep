-- East DECA Prep: let specific non-district addresses (e.g. an admin's personal Gmail) use the app.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
-- The list lives only in the database, never in the (public) site code.

-- 1. The allowlist. Row Level Security on with no policies: only the dashboard / SQL editor can read
--    or change it. Signed-in students cannot see who is on it.
create table if not exists public.allowed_emails (
  email text primary key check (email = lower(email)),
  note text,
  added_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

-- 2. District addresses, or anything on the allowlist. SECURITY DEFINER so the check can read the
--    locked table on the user's behalf; it only ever answers true/false.
create or replace function public.is_allowed_email(email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(email, '')) ~ '^[^@\s]+@(student\.)?dasd\.org$'
      or exists (select 1 from public.allowed_emails a where a.email = lower(trim(coalesce($1, ''))));
$$;

-- is_dasd_user() and the sign-up trigger both call is_allowed_email(), so they pick this up as-is.
-- The app calls is_dasd_user() to confirm an allowlisted session.
grant execute on function public.is_dasd_user() to authenticated;

-- 3. Add yourself (replace with your address, lowercase), then sign up in the app as normal:
-- insert into public.allowed_emails (email, note) values ('you@gmail.com', 'admin') on conflict do nothing;

-- To see or remove entries later:
-- select * from public.allowed_emails;
-- delete from public.allowed_emails where email = 'you@gmail.com';
