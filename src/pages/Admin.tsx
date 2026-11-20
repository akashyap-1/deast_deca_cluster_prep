// Admin-only: every account's stats (#/admin) and one account in detail (#/admin?u=<id>).
// Data comes from supabase/admin.sql, which refuses anyone who isn't an admin.
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Stat, cx, pct, LINK } from '../components/ui';
import { clusterById, fetchBank } from '../data/clusters';
import {
  fetchOverview,
  fetchUserDetail,
  formatHours,
  sessions,
  timeAgo,
  toCsv,
  type AdminAttempt,
  type AdminUserDetail,
  type AdminUserRow,
} from '../lib/admin';
import { formatDuration } from '../lib/mock';
import { navigate } from '../lib/router';
import { dayKey, DAY_MS, groupStats, weakestPis, type GroupStat } from '../lib/stats';
import type { Question, QuestionBank } from '../lib/types';

export function AdminPage({ params, isAdmin }: { params: URLSearchParams; isAdmin: boolean | null }) {
  if (isAdmin === null) return <p className="text-sm text-slate-500" role="status">Checking access…</p>;
  if (!isAdmin)
    return (
      <Card>
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">This page is only available to admins.</p>
      </Card>
    );
  const u = params.get('u');
  return u ? <UserDetail key={u} userId={u} /> : <UserList />;
}

function ErrorCard({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Card className="border-rose-200 dark:border-rose-900">
      <p className="text-sm text-rose-700 dark:text-rose-400">{message}</p>
      <Button variant="secondary" className="mt-3" onClick={retry}>
        Try again
      </Button>
    </Card>
  );
}

const acc = (correct: number, total: number) => (total ? correct / total : null);

// ---------------------------------------------------------------------------
// All users
// ---------------------------------------------------------------------------

type SortKey = 'email' | 'answers' | 'accuracy' | 'answers_7d' | 'time_ms' | 'active_days' | 'avg_mock' | 'last_ts' | 'created_at';

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'email', label: 'User', className: 'w-full text-left' },
  { key: 'answers', label: 'Answers', className: 'text-right' },
  { key: 'accuracy', label: 'Accuracy', className: 'text-right' },
  { key: 'answers_7d', label: 'Last 7d', className: 'hidden text-right md:table-cell' },
  { key: 'time_ms', label: 'Time', className: 'hidden text-right sm:table-cell' },
  { key: 'active_days', label: 'Days', className: 'hidden text-right md:table-cell' },
  { key: 'avg_mock', label: 'Mock avg', className: 'hidden text-right lg:table-cell' },
  { key: 'last_ts', label: 'Last active', className: 'hidden text-right sm:table-cell' },
];

function sortValue(r: AdminUserRow, k: SortKey): number | string {
  switch (k) {
    case 'email':
      return r.email.toLowerCase();
    case 'accuracy':
      return r.answers ? r.correct / r.answers : -1;
    case 'avg_mock':
      return r.avg_mock ?? -1;
    case 'last_ts':
      return r.last_ts ?? 0;
    case 'created_at':
      return Date.parse(r.created_at);
    default:
      return r[k];
  }
}

function UserList() {
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'last_ts', desc: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    fetchOverview()
      .then((r) => live && setRows(r))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [tick]);

  const shown = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    const list = needle ? rows.filter((r) => r.email.toLowerCase().includes(needle)) : [...rows];
    return list.sort((a, b) => {
      const x = sortValue(a, sort.key);
      const y = sortValue(b, sort.key);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return sort.desc ? -c : c;
    });
  }, [rows, q, sort]);

  if (error) return <ErrorCard message={error} retry={() => setTick((t) => t + 1)} />;
  if (!rows) return <p className="text-sm text-slate-500" role="status">Loading every account…</p>;

  const total = rows.reduce(
    (s, r) => ({ answers: s.answers + r.answers, correct: s.correct + r.correct, time: s.time + r.time_ms, week: s.week + r.answers_7d }),
    { answers: 0, correct: 0, time: 0, week: 0 },
  );
  const active7 = rows.filter((r) => r.answers_7d > 0).length;
  const everUsed = rows.filter((r) => r.answers > 0).length;

  function download() {
    const blob = new Blob([toCsv(shown)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `east-deca-prep-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setTick((t) => t + 1)}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={download}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accounts" value={rows.length.toLocaleString()} sub={`${everUsed} have answered a question`} />
        <Stat label="Active this week" value={active7.toLocaleString()} sub={`${total.week.toLocaleString()} answers in 7 days`} />
        <Stat label="Answers" value={total.answers.toLocaleString()} sub={`${pct(acc(total.correct, total.answers))} correct overall`} />
        <Stat label="Study time" value={formatHours(total.time)} sub="time spent on questions" />
      </div>

      <Card className="!p-0">
        <div className="border-b border-slate-200 p-3 sm:p-4 dark:border-slate-800">
          <label className="block">
            <span className="sr-only">Search by email</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </label>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 dark:text-slate-400">
              {COLUMNS.map((c) => (
                <th key={c.key} className={cx('px-3 py-2 font-medium whitespace-nowrap sm:px-4', c.className ?? 'text-left')}>
                  <button
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                    onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key !== 'email' }))}
                  >
                    {c.label}
                    {sort.key === c.key && <span aria-hidden="true">{sort.desc ? '↓' : '↑'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr
                key={r.user_id}
                onClick={() => navigate(`/admin?u=${r.user_id}`)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <td className="w-full max-w-0 px-3 py-2.5 sm:px-4">
                  <a href={`#/admin?u=${r.user_id}`} className="block truncate font-semibold" onClick={(e) => e.stopPropagation()}>
                    {r.email}
                  </a>
                  <div className="mt-0.5 flex flex-wrap gap-1 text-xs text-slate-500 dark:text-slate-400">
                    {r.clusters.length ? r.clusters.map((c) => clusterById(c).short).join(' · ') : 'no answers yet'}
                    {r.blacklisted && <Badge tone="rose">blacklisted</Badge>}
                    {r.banned && <Badge tone="rose">banned</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">{r.answers.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right tabular-nums sm:px-4">{pct(acc(r.correct, r.answers))}</td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:px-4 md:table-cell">{r.answers_7d.toLocaleString()}</td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell sm:px-4">{formatHours(r.time_ms)}</td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:px-4 md:table-cell">{r.active_days}</td>
                <td className="hidden px-3 py-2.5 text-right tabular-nums sm:px-4 lg:table-cell">{r.mocks ? `${pct(r.avg_mock)} · ${r.mocks}` : '—'}</td>
                <td className="hidden px-3 py-2.5 text-right whitespace-nowrap text-slate-500 sm:table-cell sm:px-4 dark:text-slate-400">{timeAgo(r.last_ts)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <p className="p-4 text-sm text-slate-500">No accounts match.</p>}
      </Card>
    </div>
  );
}

function Badge({ tone, children }: { tone: 'rose' | 'slate'; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        'rounded px-1.5 py-px text-[0.7rem] font-semibold',
        tone === 'rose' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      )}
    >
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// One user
// ---------------------------------------------------------------------------

const bankCache = new Map<string, Promise<QuestionBank>>();
function loadBankFor(cluster: string): Promise<QuestionBank> {
  let p = bankCache.get(cluster);
  if (!p) {
    p = fetchBank(cluster).then((t) => JSON.parse(t) as QuestionBank);
    p.catch(() => bankCache.delete(cluster));
    bankCache.set(cluster, p);
  }
  return p;
}

function summarize(list: AdminAttempt[]) {
  const correct = list.filter((a) => a.correct).length;
  const time = list.reduce((s, a) => s + Math.min(a.ms, 600000), 0);
  return {
    answers: list.length,
    correct,
    accuracy: acc(correct, list.length),
    time,
    avgSec: list.length ? time / list.length / 1000 : null,
    unique: new Set(list.map((a) => a.qid)).size,
  };
}

function UserDetail({ userId }: { userId: string }) {
  const [d, setD] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true;
    setError(null);
    fetchUserDetail(userId)
      .then((r) => live && setD(r))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [userId, tick]);

  const back = (
    <a href="#/admin" className={cx(LINK, 'text-sm')}>
      ← All users
    </a>
  );
  if (error)
    return (
      <div className="space-y-4">
        {back}
        <ErrorCard message={error} retry={() => setTick((t) => t + 1)} />
      </div>
    );
  if (!d)
    return (
      <div className="space-y-4">
        {back}
        <p className="text-sm text-slate-500" role="status">Loading account…</p>
      </div>
    );
  if (!d.user)
    return (
      <div className="space-y-4">
        {back}
        <Card>That account no longer exists.</Card>
      </div>
    );

  return <UserDetailView d={d} back={back} />;
}

function UserDetailView({ d, back }: { d: AdminUserDetail; back: React.ReactNode }) {
  const user = d.user!;
  const all = summarize(d.attempts);
  const sess = useMemo(() => sessions(d.attempts), [d.attempts]);
  const days = new Set(d.attempts.map((a) => dayKey(a.ts))).size;
  const last = d.attempts.length ? d.attempts[d.attempts.length - 1].ts : null;
  const clusters = useMemo(() => {
    const m = new Map<string, AdminAttempt[]>();
    for (const a of d.attempts) m.set(a.cluster, [...(m.get(a.cluster) ?? []), a]);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [d.attempts]);
  const settings = d.profile?.settings ?? {};

  return (
    <div className="space-y-4">
      {back}
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold break-all">
          {user.email}
          {user.blacklisted && <Badge tone="rose">blacklisted</Badge>}
          {user.banned && <Badge tone="rose">banned</Badge>}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Joined {new Date(user.created_at).toLocaleDateString()} · last sign-in{' '}
          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'never'} · currently on{' '}
          {clusterById(d.profile?.current_cluster ?? 'finance').name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Accuracy" value={pct(all.accuracy)} sub={`${all.correct.toLocaleString()} of ${all.answers.toLocaleString()} correct`} />
        <Stat label="Answers" value={all.answers.toLocaleString()} sub={`${all.unique.toLocaleString()} different questions`} />
        <Stat label="Study time" value={formatHours(all.time)} sub={all.avgSec != null ? `${all.avgSec.toFixed(0)}s per question` : 'no answers'} />
        <Stat label="Active days" value={days} sub={`${sess.length} sessions · last ${timeAgo(last)}`} />
      </div>

      <Activity attempts={d.attempts} />

      {clusters.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold">By cluster and mode</h2>
          <BreakdownTable
            rows={[
              ...clusters.map(([c, list]) => ({ label: clusterById(c).name, s: summarize(list) })),
              ...(['smart', 'practice', 'mock'] as const).map((m) => ({
                label: m === 'smart' ? 'Smart practice (mode)' : m === 'practice' ? 'Practice (mode)' : 'Mock exam (mode)',
                s: summarize(d.attempts.filter((a) => a.mode === m)),
                muted: true,
              })),
            ]}
          />
        </Card>
      )}

      {clusters.length > 0 && <ClusterDeepDive clusters={clusters.map(([c]) => c)} attempts={d.attempts} />}

      <Card>
        <h2 className="mb-3 font-bold">Mock exams</h2>
        {d.active_mocks.map((m) => (
          <p key={m.cluster} className="mb-2 text-sm text-slate-600 dark:text-slate-300">
            In progress: {m.label} ({clusterById(m.cluster).short}), {m.answered}/{m.total} answered, last saved {timeAgo(Date.parse(m.updated_at))}
          </p>
        ))}
        {d.mocks.length ? (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {d.mocks.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
                <span>
                  <span className="font-semibold">{m.label}</span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    · {clusterById(m.cluster).short} · {new Date(m.finishedAt).toLocaleString()}
                  </span>
                </span>
                <span className="tabular-nums">
                  <span className="font-bold">
                    {m.score}/{m.total}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">
                    ({pct(acc(m.score, m.total))}) in {formatDuration(m.durationMs)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          !d.active_mocks.length && <p className="text-sm text-slate-500">No mock exams yet.</p>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">Recent sessions</h2>
        {sess.length ? (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {[...sess]
              .reverse()
              .slice(0, 15)
              .map((s) => (
                <li key={s.start} className="flex flex-wrap justify-between gap-x-4 py-2">
                  <span>
                    {new Date(s.start).toLocaleDateString()}{' '}
                    <span className="text-slate-500 dark:text-slate-400">
                      {new Date(s.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} –{' '}
                      {new Date(s.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </span>
                  <span className="tabular-nums">
                    {s.answers} answers · {pct(acc(s.correct, s.answers))} · {formatHours(s.end - s.start)}
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No sessions yet.</p>
        )}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">A gap of more than 30 minutes between answers starts a new session.</p>
      </Card>

      <Card>
        <h2 className="mb-2 font-bold">Account and settings</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-slate-500">Daily goal</dt>
          <dd>{String(settings.dailyGoal ?? '—')}</dd>
          <dt className="text-slate-500">Theme</dt>
          <dd>{String(settings.theme ?? '—')}</dd>
          <dt className="text-slate-500">Timer shown</dt>
          <dd>{settings.showTimer == null ? '—' : settings.showTimer ? 'yes' : 'no'}</dd>
          <dt className="text-slate-500">Bookmarks</dt>
          <dd>{d.bookmarks.length.toLocaleString()}</dd>
          <dt className="text-slate-500">User id</dt>
          <dd className="font-mono text-xs break-all">{user.user_id}</dd>
        </dl>
      </Card>
    </div>
  );
}

function BreakdownTable({ rows }: { rows: { label: string; s: ReturnType<typeof summarize>; muted?: boolean }[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-slate-500 dark:text-slate-400">
          <th className="py-1 text-left font-medium" />
          <th className="py-1 text-right font-medium">Answers</th>
          <th className="py-1 text-right font-medium">Accuracy</th>
          <th className="hidden py-1 text-right font-medium sm:table-cell">Time</th>
          <th className="hidden py-1 text-right font-medium sm:table-cell">Per question</th>
          <th className="hidden py-1 text-right font-medium md:table-cell">Different Qs</th>
        </tr>
      </thead>
      <tbody>
        {rows
          .filter((r) => r.s.answers > 0)
          .map((r) => (
            <tr key={r.label} className={cx('border-t border-slate-100 dark:border-slate-800', r.muted && 'text-slate-500 dark:text-slate-400')}>
              <td className="py-2 pr-2">{r.label}</td>
              <td className="py-2 text-right tabular-nums">{r.s.answers.toLocaleString()}</td>
              <td className="py-2 text-right tabular-nums">{pct(r.s.accuracy)}</td>
              <td className="hidden py-2 text-right tabular-nums sm:table-cell">{formatHours(r.s.time)}</td>
              <td className="hidden py-2 text-right tabular-nums sm:table-cell">{r.s.avgSec == null ? '—' : `${r.s.avgSec.toFixed(0)}s`}</td>
              <td className="hidden py-2 text-right tabular-nums md:table-cell">{r.s.unique.toLocaleString()}</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}

/** Answers per day for the last 30 days, with the correct share filled in. */
function Activity({ attempts }: { attempts: AdminAttempt[] }) {
  const days = useMemo(() => {
    const per = new Map<string, { n: number; c: number }>();
    for (const a of attempts) {
      const k = dayKey(a.ts);
      const v = per.get(k) ?? { n: 0, c: 0 };
      v.n++;
      if (a.correct) v.c++;
      per.set(k, v);
    }
    const out: { key: string; date: Date; n: number; c: number }[] = [];
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const date = new Date(d.getTime() - i * DAY_MS);
      const key = dayKey(date.getTime());
      out.push({ key, date, ...(per.get(key) ?? { n: 0, c: 0 }) });
    }
    return out;
  }, [attempts]);
  const max = Math.max(1, ...days.map((x) => x.n));
  const total = days.reduce((s, x) => s + x.n, 0);
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-bold">Last 30 days</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">{total.toLocaleString()} answers · gold = correct</span>
      </div>
      <div className="flex h-28 items-end gap-[3px]" role="img" aria-label={`Answers per day for the last 30 days, ${total} in total`}>
        {days.map((x) => (
          <div
            key={x.key}
            title={`${x.date.toLocaleDateString()}: ${x.n} answers, ${x.c} correct`}
            className="flex flex-1 flex-col justify-end overflow-hidden rounded-t-sm bg-slate-200 dark:bg-slate-700"
            style={{ height: x.n ? `${Math.max(4, (x.n / max) * 100)}%` : '2px' }}
          >
            <div className="bg-gold-400" style={{ height: x.n ? `${(x.c / x.n) * 100}%` : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.7rem] text-slate-500 dark:text-slate-400">
        <span>{days[0].date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
        <span>today</span>
      </div>
    </Card>
  );
}

/** Instructional areas, weakest PIs and recent answers for one cluster, using that cluster's bank. */
function ClusterDeepDive({ clusters, attempts }: { clusters: string[]; attempts: AdminAttempt[] }) {
  const [cluster, setCluster] = useState(clusters[0]);
  const [bank, setBank] = useState<{ cluster: string; b: QuestionBank } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setError(null);
    loadBankFor(cluster)
      .then((b) => live && setBank({ cluster, b }))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [cluster]);

  const list = useMemo(() => attempts.filter((a) => a.cluster === cluster), [attempts, cluster]);
  const b = bank?.cluster === cluster ? bank.b : null;
  const byId = useMemo(() => new Map<string, Question>((b?.questions ?? []).map((q) => [q.id, q])), [b]);
  const areaStats = useMemo(() => (b ? groupStats(b.questions, list, (q) => q.instructionalArea) : null), [b, list]);
  const piStats = useMemo(() => (b ? groupStats(b.questions, list, (q) => q.piCode) : null), [b, list]);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">Strengths and weaknesses</h2>
        {clusters.length > 1 && (
          <select
            value={cluster}
            onChange={(e) => setCluster(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
            aria-label="Cluster"
          >
            {clusters.map((c) => (
              <option key={c} value={c}>
                {clusterById(c).name}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="text-sm text-rose-700 dark:text-rose-400">Couldn’t load the {clusterById(cluster).name} questions: {error}</p>}
      {!b && !error && <p className="text-sm text-slate-500">Loading questions…</p>}
      {b && areaStats && piStats && (
        <>
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Instructional areas</h3>
          <ul className="mt-2 space-y-2">
            {[...areaStats.values()]
              .filter((g) => g.attempts > 0)
              .sort((x, y) => (x.accuracy ?? 0) - (y.accuracy ?? 0))
              .map((g) => (
                <AreaRow key={g.key} g={g} />
              ))}
          </ul>

          <h3 className="mt-5 text-sm font-semibold text-slate-600 dark:text-slate-300">Weakest performance indicators</h3>
          {weakestPis(piStats, 5).length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {weakestPis(piStats, 5).map((g) => {
                const q = b.questions.find((x) => x.piCode === g.key && x.piDescription);
                return (
                  <li key={g.key} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-mono text-xs font-semibold">{g.key}</span> <span className="text-slate-600 dark:text-slate-300">{q?.piDescription}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {g.correct}/{g.attempts}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">Not enough answers yet.</p>
          )}

          <h3 className="mt-5 text-sm font-semibold text-slate-600 dark:text-slate-300">Recent answers</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {[...list]
              .reverse()
              .slice(0, 25)
              .map((a) => {
                const q = byId.get(a.qid);
                return (
                  <li key={`${a.qid}-${a.ts}`} className="flex gap-3 py-2">
                    <span
                      className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', a.correct ? 'bg-emerald-500' : 'bg-rose-500')}
                      aria-label={a.correct ? 'correct' : 'wrong'}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2">{q?.question ?? a.qid}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Chose {a.choice}
                        {q && !a.correct ? `, answer ${q.correct}` : ''} · {a.mode} · {Math.round(a.ms / 1000)}s · {timeAgo(a.ts)}
                      </span>
                    </span>
                  </li>
                );
              })}
          </ul>
        </>
      )}
    </Card>
  );
}

function AreaRow({ g }: { g: GroupStat }) {
  return (
    <li className="text-sm">
      <div className="flex justify-between gap-3">
        <span className="min-w-0 truncate">{g.key}</span>
        <span className="shrink-0 tabular-nums">
          {pct(g.accuracy)} <span className="text-slate-500 dark:text-slate-400">· {g.attempts}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={cx('h-full rounded-full', (g.accuracy ?? 0) >= 0.7 ? 'bg-emerald-500' : (g.accuracy ?? 0) >= 0.5 ? 'bg-gold-400' : 'bg-rose-500')}
          style={{ width: `${(g.accuracy ?? 0) * 100}%` }}
        />
      </div>
    </li>
  );
}
