-- East DECA Prep: admin stats page (#/admin).
-- Run in Supabase AFTER blacklist.sql: SQL Editor -> New query -> paste -> Run. Safe to re-run.
--
-- Admins can read every user's stats through the two functions below. Nobody else can: the
-- functions check is_admin() on the server, and the tables keep their "own rows" policies.

-- 1. Who is an admin. Locked like the allowlist: only the dashboard / SQL editor can change it.
create table if not exists public.admin_emails (
  email text primary key check (email = lower(email)),
  added_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

insert into public.admin_emails (email) values ('advikkashyap1@gmail.com') on conflict do nothing;
-- A Gmail address also needs to be on the allowlist to sign in at all.
insert into public.allowed_emails (email, note) values ('advikkashyap1@gmail.com', 'admin') on conflict do nothing;

-- 2. True when the signed-in user is a confirmed admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    join public.admin_emails a on a.email = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 3. One row per account with everything aggregated. Time is the sum of per-question time, each
--    answer capped at 10 minutes so a tab left open doesn't count as hours of study.
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  week_ago bigint := (extract(epoch from now()) * 1000)::bigint - 7 * 86400000;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.last_ts desc nulls last, r.created_at desc)
    from (
      select
        u.id as user_id,
        u.email,
        u.created_at,
        u.last_sign_in_at,
        (u.banned_until is not null and u.banned_until > now()) as banned,
        exists (select 1 from public.email_blacklist b where b.email = lower(u.email)) as blacklisted,
        p.current_cluster,
        (p.settings ->> 'dailyGoal')::int as daily_goal,
        coalesce(a.answers, 0) as answers,
        coalesce(a.correct, 0) as correct,
        coalesce(a.time_ms, 0) as time_ms,
        a.first_ts,
        a.last_ts,
        coalesce(a.active_days, 0) as active_days,
        coalesce(a.unique_questions, 0) as unique_questions,
        coalesce(a.answers_7d, 0) as answers_7d,
        coalesce(a.correct_7d, 0) as correct_7d,
        coalesce(a.smart, 0) as smart,
        coalesce(a.practice, 0) as practice,
        coalesce(a.mock, 0) as mock,
        coalesce(a.clusters, '{}') as clusters,
        coalesce(m.mocks, 0) as mocks,
        m.avg_mock,
        m.best_mock,
        coalesce(bk.bookmarks, 0) as bookmarks
      from auth.users u
      left join public.profiles p on p.user_id = u.id
      left join lateral (
        select
          count(*) as answers,
          count(*) filter (where t.correct) as correct,
          sum(least(t.ms, 600000)) as time_ms,
          min(t.ts) as first_ts,
          max(t.ts) as last_ts,
          count(distinct (to_timestamp(t.ts / 1000.0) at time zone 'America/New_York')::date) as active_days,
          count(distinct (t.cluster, t.qid)) as unique_questions,
          count(*) filter (where t.ts >= week_ago) as answers_7d,
          count(*) filter (where t.ts >= week_ago and t.correct) as correct_7d,
          count(*) filter (where t.mode = 'smart') as smart,
          count(*) filter (where t.mode = 'practice') as practice,
          count(*) filter (where t.mode = 'mock') as mock,
          array_agg(distinct t.cluster) as clusters
        from public.attempts t
        where t.user_id = u.id
      ) a on true
      left join lateral (
        select
          count(*) as mocks,
          avg((x.data ->> 'score')::numeric / nullif((x.data ->> 'total')::numeric, 0)) as avg_mock,
          max((x.data ->> 'score')::numeric / nullif((x.data ->> 'total')::numeric, 0)) as best_mock
        from public.mocks x
        where x.user_id = u.id
      ) m on true
      left join lateral (
        select count(*) as bookmarks from public.bookmarks b where b.user_id = u.id
      ) bk on true
    ) r
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

-- 4. Everything stored for one account. The page computes the breakdowns from this.
create or replace function public.admin_user_detail(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'user', (
      select jsonb_build_object(
        'user_id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'banned', (u.banned_until is not null and u.banned_until > now()),
        'blacklisted', exists (select 1 from public.email_blacklist b where b.email = lower(u.email))
      )
      from auth.users u where u.id = target
    ),
    'profile', (select to_jsonb(p) - 'user_id' from public.profiles p where p.user_id = target),
    'attempts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'cluster', t.cluster, 'qid', t.qid, 'choice', t.choice, 'correct', t.correct,
        'ts', t.ts, 'ms', t.ms, 'mode', t.mode
      ) order by t.ts)
      from public.attempts t where t.user_id = target
    ), '[]'::jsonb),
    'mocks', coalesce((
      select jsonb_agg((x.data - 'answers') || jsonb_build_object('cluster', x.cluster) order by x.finished_at desc)
      from public.mocks x where x.user_id = target
    ), '[]'::jsonb),
    'bookmarks', coalesce((
      select jsonb_agg(jsonb_build_object('cluster', b.cluster, 'qid', b.qid, 'created_at', b.created_at))
      from public.bookmarks b where b.user_id = target
    ), '[]'::jsonb),
    'active_mocks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'cluster', a.cluster, 'label', a.data ->> 'label', 'started_at', a.data -> 'startedAt',
        'answered', (select count(*) from jsonb_array_elements(a.data -> 'answers') e where e ->> 'choice' is not null),
        'total', jsonb_array_length(a.data -> 'answers'), 'updated_at', a.updated_at
      ))
      from public.active_mocks a where a.user_id = target
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_user_detail(uuid) from public, anon;
grant execute on function public.admin_user_detail(uuid) to authenticated;
