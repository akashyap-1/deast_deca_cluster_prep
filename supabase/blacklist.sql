-- East DECA Prep: block specific addresses, even district ones.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run. Safe to re-run.
-- Self-contained: it also creates the allowlist table if allowlist.sql was never run.

-- 1. The blacklist. Row Level Security on with no policies: only the dashboard / SQL editor can read
--    or change it.
create table if not exists public.email_blacklist (
  email text primary key check (email = lower(email)),
  note text,
  added_at timestamptz not null default now()
);
alter table public.email_blacklist enable row level security;
revoke all on public.email_blacklist from anon, authenticated;

-- Needed by the function below (no-op if allowlist.sql already created it).
create table if not exists public.allowed_emails (
  email text primary key check (email = lower(email)),
  note text,
  added_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;
revoke all on public.allowed_emails from anon, authenticated;

-- 2. District address or allowlisted, AND not blacklisted. The sign-up trigger and is_dasd_user()
--    (used by every row-level policy) both call this, so blacklisted users can't sign up and
--    can't read or write any data.
create or replace function public.is_allowed_email(email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
      lower(coalesce($1, '')) ~ '^[^@\s]+@(student\.)?dasd\.org$'
      or exists (select 1 from public.allowed_emails a where a.email = lower(trim(coalesce($1, ''))))
    )
    and not exists (select 1 from public.email_blacklist b where b.email = lower(trim(coalesce($1, ''))));
$$;

grant execute on function public.is_dasd_user() to authenticated;

-- 3. The blocked addresses (lowercase).
insert into public.email_blacklist (email)
values
  ('ktailor01@student.dasd.org'),
  ('avadla01@student.dasd.org')
on conflict (email) do nothing;

-- 4. If they already have accounts, stop them signing in. Reversible:
--    update auth.users set banned_until = null where email = '...';
update auth.users
set banned_until = 'infinity'
where lower(email) in (select email from public.email_blacklist);

-- To see or remove entries later:
-- select * from public.email_blacklist;
-- delete from public.email_blacklist where email = 'someone@student.dasd.org';
