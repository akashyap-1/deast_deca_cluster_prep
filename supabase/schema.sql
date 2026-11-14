-- East DECA Prep: database schema.
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (it uses IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).

-- ---------------------------------------------------------------------------
-- 1. Only Downingtown Area School District addresses may sign up.
--    Enforced inside the database, so the browser cannot bypass it.
-- ---------------------------------------------------------------------------
create or replace function public.is_allowed_email(email text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(email, '')) ~ '^[^@\s]+@(student\.)?dasd\.org$';
$$;

create or replace function public.enforce_dasd_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_allowed_email(new.email) then
    raise exception 'Only @student.dasd.org and @dasd.org accounts can sign up.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_dasd_signup on auth.users;
create trigger enforce_dasd_signup
  before insert or update of email on auth.users
  for each row execute function public.enforce_dasd_signup();

-- True when the signed-in user's email is a district address. Used by every policy below.
create or replace function public.is_dasd_user()
returns boolean
language sql
stable
as $$
  select public.is_allowed_email(auth.jwt() ->> 'email');
$$;

-- ---------------------------------------------------------------------------
-- 2. Tables. Every row belongs to one user; cluster ids are e.g. 'finance', 'marketing'.
-- ---------------------------------------------------------------------------

-- One row per user: settings shared across clusters and the last cluster they used.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  current_cluster text not null default 'finance',
  updated_at timestamptz not null default now()
);

-- Every answered question. Append-only; the client generates the id so retries are idempotent.
create table if not exists public.attempts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  cluster text not null,
  qid text not null,
  choice text not null check (choice in ('A', 'B', 'C', 'D')),
  correct boolean not null,
  ts bigint not null,
  ms integer not null default 0,
  mode text not null check (mode in ('smart', 'practice', 'mock')),
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_cluster on public.attempts (user_id, cluster, ts);

create table if not exists public.bookmarks (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  cluster text not null,
  qid text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, cluster, qid)
);

-- Finished mock exams (the full result object is kept in data).
create table if not exists public.mocks (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  cluster text not null,
  data jsonb not null,
  finished_at bigint not null
);
create index if not exists mocks_user_cluster on public.mocks (user_id, cluster);

-- The mock exam in progress, at most one per user per cluster, so it resumes on another device.
create table if not exists public.active_mocks (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  cluster text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, cluster)
);

-- ---------------------------------------------------------------------------
-- 3. Row Level Security: a user can only see and change their own rows,
--    and only if they signed in with a district address.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.bookmarks enable row level security;
alter table public.mocks enable row level security;
alter table public.active_mocks enable row level security;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'attempts', 'bookmarks', 'mocks', 'active_mocks'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid() and public.is_dasd_user())
         with check (user_id = auth.uid() and public.is_dasd_user())',
      t
    );
  end loop;
end $$;

-- Nobody signed out can touch anything.
revoke all on public.profiles, public.attempts, public.bookmarks, public.mocks, public.active_mocks from anon;
grant select, insert, update, delete on public.profiles, public.attempts, public.bookmarks, public.mocks, public.active_mocks to authenticated;
