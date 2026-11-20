// Admin-only data (supabase/admin.sql). The database refuses these calls for anyone who isn't on
// its admin list; the client check only decides whether to show the Admin page in the nav.
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { AttemptMode } from './storage';
import type { Letter } from './types';

export interface AdminUserRow {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
  blacklisted: boolean;
  current_cluster: string | null;
  daily_goal: number | null;
  answers: number;
  correct: number;
  /** Sum of per-question time, each answer capped at 10 minutes. */
  time_ms: number;
  first_ts: number | null;
  last_ts: number | null;
  active_days: number;
  unique_questions: number;
  answers_7d: number;
  correct_7d: number;
  smart: number;
  practice: number;
  mock: number;
  clusters: string[];
  mocks: number;
  avg_mock: number | null;
  best_mock: number | null;
  bookmarks: number;
}

export interface AdminAttempt {
  cluster: string;
  qid: string;
  choice: Letter;
  correct: boolean;
  ts: number;
  ms: number;
  mode: AttemptMode;
}

export interface AdminMock {
  id: string;
  cluster: string;
  kind: 'replay' | 'mix';
  label: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  timeLimitMs: number;
  score: number;
  total: number;
}

export interface AdminUserDetail {
  user: Pick<AdminUserRow, 'user_id' | 'email' | 'created_at' | 'last_sign_in_at' | 'banned' | 'blacklisted'> | null;
  profile: { settings: Record<string, unknown>; current_cluster: string; updated_at: string } | null;
  attempts: AdminAttempt[];
  mocks: AdminMock[];
  bookmarks: { cluster: string; qid: string; created_at: string }[];
  active_mocks: { cluster: string; label: string; started_at: number; answered: number; total: number; updated_at: string }[];
}

const num = (v: unknown) => (v == null ? null : Number(v));

export async function fetchOverview(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase.rpc('admin_overview');
  if (error) throw new Error(error.message);
  // Postgres bigint/numeric arrive as numbers or strings depending on size; normalise.
  return ((data ?? []) as AdminUserRow[]).map((r) => ({
    ...r,
    first_ts: num(r.first_ts),
    last_ts: num(r.last_ts),
    time_ms: Number(r.time_ms),
    avg_mock: num(r.avg_mock),
    best_mock: num(r.best_mock),
    clusters: (r.clusters ?? []).filter(Boolean),
  }));
}

export async function fetchUserDetail(userId: string): Promise<AdminUserDetail> {
  const { data, error } = await supabase.rpc('admin_user_detail', { target: userId });
  if (error) throw new Error(error.message);
  const d = data as AdminUserDetail;
  return { ...d, attempts: d.attempts.map((a) => ({ ...a, ts: Number(a.ts) })) };
}

let cached: { userId: string; admin: boolean } | null = null;

/** Whether the signed-in user is an admin; null until the database answers. */
export function useIsAdmin(userId: string | null): boolean | null {
  const [admin, setAdmin] = useState<boolean | null>(cached?.userId === userId ? cached.admin : null);
  useEffect(() => {
    if (!userId) return;
    if (cached?.userId === userId) {
      setAdmin(cached.admin);
      return;
    }
    let live = true;
    void supabase.rpc('is_admin').then(({ data, error }) => {
      const ok = !error && data === true;
      cached = { userId, admin: ok };
      if (live) setAdmin(ok);
    });
    return () => {
      live = false;
    };
  }, [userId]);
  return admin;
}

/** Answers grouped into study sessions: a gap of more than 30 minutes starts a new one. */
export function sessions(attempts: AdminAttempt[], gapMs = 30 * 60 * 1000) {
  const out: { start: number; end: number; answers: number; correct: number }[] = [];
  for (const a of attempts) {
    const last = out[out.length - 1];
    if (last && a.ts - last.end <= gapMs) {
      last.end = a.ts;
      last.answers++;
      if (a.correct) last.correct++;
    } else out.push({ start: a.ts - Math.min(a.ms, 600000), end: a.ts, answers: 1, correct: a.correct ? 1 : 0 });
  }
  return out;
}

export function formatHours(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}

export function timeAgo(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return 'never';
  const s = Math.round((now - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function toCsv(rows: AdminUserRow[]): string {
  const cols: (keyof AdminUserRow)[] = [
    'email', 'created_at', 'last_sign_in_at', 'answers', 'correct', 'time_ms', 'first_ts', 'last_ts', 'active_days',
    'unique_questions', 'answers_7d', 'correct_7d', 'smart', 'practice', 'mock', 'clusters', 'mocks', 'avg_mock',
    'best_mock', 'bookmarks', 'current_cluster', 'daily_goal', 'banned', 'blacklisted',
  ];
  const cell = (v: unknown) => {
    if (v == null) return '';
    const s = Array.isArray(v) ? v.join(';') : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = [...cols, 'accuracy', 'last_active'].join(',');
  const body = rows.map((r) =>
    [...cols.map((c) => cell(r[c])), r.answers ? (r.correct / r.answers).toFixed(4) : '', r.last_ts ? new Date(r.last_ts).toISOString() : ''].join(','),
  );
  return [head, ...body].join('\n');
}
