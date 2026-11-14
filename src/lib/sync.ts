// Keeps the progress store in step with Supabase.
// - openSession() loads the signed-in user's profile and their current cluster's progress.
// - Every store change becomes a job in a small persistent queue that is written to Supabase in
//   order, retried with backoff when offline, so answers are never lost on a flaky connection.
import { useSyncExternalStore } from 'react';
import { CLUSTERS, DEFAULT_CLUSTER, hasBank } from '../data/clusters';
import { loadBank } from '../data/bank';
import { supabase } from './supabase';
import {
  DEFAULT_SETTINGS,
  emptyState,
  parseState,
  store,
  STORAGE_KEY,
  type ActiveMock,
  type AppState,
  type Attempt,
  type MockResult,
  type Op,
  type Settings,
} from './storage';

// ---------------------------------------------------------------- session state

export type SessionState =
  | { status: 'idle' }
  | { status: 'loading'; cluster: string | null }
  | { status: 'ready'; cluster: string; userId: string; email: string }
  | { status: 'error'; message: string };

export type SaveStatus = 'saved' | 'saving' | 'offline';

let session: SessionState = { status: 'idle' };
let saveStatus: SaveStatus = 'saved';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => session, () => session);
}
export function useSaveStatus(): SaveStatus {
  return useSyncExternalStore(subscribe, () => saveStatus, () => saveStatus);
}

function setSession(s: SessionState) {
  session = s;
  emit();
}
function setSaveStatus(s: SaveStatus) {
  if (s !== saveStatus) {
    saveStatus = s;
    emit();
  }
}

// ---------------------------------------------------------------- queue

type Job =
  | { k: 'attempts'; cluster: string; rows: (Attempt & { id: string })[] }
  | { k: 'bookmark'; cluster: string; qid: string; on: boolean }
  | { k: 'settings'; settings: Settings }
  | { k: 'cluster'; cluster: string }
  | { k: 'activeMock'; cluster: string; mock: ActiveMock | null }
  | { k: 'mock'; cluster: string; result: MockResult }
  | { k: 'reset'; cluster: string }
  | { k: 'replace'; cluster: string; state: AppState };

let userId: string | null = null;
let queue: Job[] = [];
let running = false;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let backoff = 1000;

const queueKey = () => `eastdeca:queue:${userId}`;
const cacheKey = (cluster: string) => `eastdeca:v1:${userId}:${cluster}`;

function persistQueue() {
  try {
    localStorage.setItem(queueKey(), JSON.stringify(queue));
  } catch {
    /* storage blocked: the queue still lives in memory */
  }
}

function restoreQueue() {
  try {
    const raw = localStorage.getItem(queueKey());
    queue = raw ? (JSON.parse(raw) as Job[]) : [];
  } catch {
    queue = [];
  }
}

function enqueue(job: Job) {
  // Only the latest settings / active mock matter, so drop older pending copies
  // (never the job at the head, which may be in flight).
  if (job.k === 'settings' || job.k === 'activeMock' || job.k === 'cluster') {
    queue = queue.filter(
      (j, i) =>
        i === 0 && running
          ? true
          : !(j.k === job.k && (job.k === 'settings' || job.k === 'cluster' || (j as { cluster: string }).cluster === (job as { cluster: string }).cluster)),
    );
  }
  queue.push(job);
  persistQueue();
  void drain();
}

/** Turns a store change into a queued job for the current cluster. */
function sink(op: Op) {
  if (session.status !== 'ready') return;
  const cluster = session.cluster;
  switch (op.t) {
    case 'attempts':
      if (op.items.length) enqueue({ k: 'attempts', cluster, rows: op.items.map((a) => ({ ...a, id: crypto.randomUUID() })) });
      break;
    case 'bookmark':
      enqueue({ k: 'bookmark', cluster, qid: op.qid, on: op.on });
      break;
    case 'settings':
      enqueue({ k: 'settings', settings: op.settings });
      break;
    case 'activeMock':
      enqueue({ k: 'activeMock', cluster, mock: op.mock });
      break;
    case 'mock':
      enqueue({ k: 'mock', cluster, result: op.result });
      break;
    case 'reset':
      enqueue({ k: 'reset', cluster });
      break;
    case 'replace':
      enqueue({ k: 'replace', cluster, state: op.state });
      break;
  }
}

/** A Postgres/PostgREST error means the request reached the server and was refused: retrying won't help. */
function isPermanent(err: { code?: string } | null): boolean {
  return !!err?.code && (/^[0-9A-Z]{5}$/.test(err.code) || err.code.startsWith('PGRST'));
}

async function check(p: PromiseLike<{ error: { code?: string; message: string } | null }>) {
  const { error } = await p;
  if (error) throw error;
}

function attemptRow(cluster: string, a: Attempt & { id: string }) {
  return { id: a.id, user_id: userId, cluster, qid: a.qid, choice: a.choice, correct: a.correct, ts: a.ts, ms: Math.round(a.ms), mode: a.mode };
}

async function clearCluster(cluster: string) {
  for (const table of ['attempts', 'bookmarks', 'mocks', 'active_mocks']) {
    await check(supabase.from(table).delete().eq('user_id', userId!).eq('cluster', cluster));
  }
}

async function run(job: Job) {
  const uid = userId!;
  switch (job.k) {
    case 'attempts':
      return check(supabase.from('attempts').upsert(job.rows.map((a) => attemptRow(job.cluster, a)), { onConflict: 'id', ignoreDuplicates: true }));
    case 'bookmark':
      return job.on
        ? check(supabase.from('bookmarks').upsert({ user_id: uid, cluster: job.cluster, qid: job.qid }, { onConflict: 'user_id,cluster,qid', ignoreDuplicates: true }))
        : check(supabase.from('bookmarks').delete().eq('user_id', uid).eq('cluster', job.cluster).eq('qid', job.qid));
    case 'settings':
      return check(supabase.from('profiles').upsert({ user_id: uid, settings: job.settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }));
    case 'cluster':
      return check(supabase.from('profiles').upsert({ user_id: uid, current_cluster: job.cluster, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }));
    case 'activeMock':
      return job.mock
        ? check(supabase.from('active_mocks').upsert({ user_id: uid, cluster: job.cluster, data: job.mock, updated_at: new Date().toISOString() }, { onConflict: 'user_id,cluster' }))
        : check(supabase.from('active_mocks').delete().eq('user_id', uid).eq('cluster', job.cluster));
    case 'mock':
      return check(supabase.from('mocks').upsert({ id: job.result.id, user_id: uid, cluster: job.cluster, data: job.result, finished_at: job.result.finishedAt }, { onConflict: 'id' }));
    case 'reset':
      return clearCluster(job.cluster);
    case 'replace': {
      await clearCluster(job.cluster);
      const rows = job.state.attempts.map((a) => attemptRow(job.cluster, { ...a, id: crypto.randomUUID() }));
      for (let i = 0; i < rows.length; i += 500) await check(supabase.from('attempts').insert(rows.slice(i, i + 500)));
      if (job.state.bookmarks.length)
        await check(supabase.from('bookmarks').insert(job.state.bookmarks.map((qid) => ({ user_id: uid, cluster: job.cluster, qid }))));
      if (job.state.mocks.length)
        await check(supabase.from('mocks').upsert(job.state.mocks.map((m) => ({ id: m.id, user_id: uid, cluster: job.cluster, data: m, finished_at: m.finishedAt })), { onConflict: 'id' }));
      if (job.state.activeMock)
        await check(supabase.from('active_mocks').upsert({ user_id: uid, cluster: job.cluster, data: job.state.activeMock }, { onConflict: 'user_id,cluster' }));
      return;
    }
  }
}

/** Writes queued jobs in order. Resolves true when the queue is empty, false if it stopped on a network error. */
async function drain(): Promise<boolean> {
  if (running) return false;
  if (!userId) return false;
  running = true;
  clearTimeout(retryTimer);
  try {
    while (queue.length) {
      setSaveStatus('saving');
      const job = queue[0];
      try {
        await run(job);
      } catch (e) {
        const err = e as { code?: string; message: string };
        if (!isPermanent(err)) {
          setSaveStatus('offline');
          retryTimer = setTimeout(() => void drain(), backoff);
          backoff = Math.min(backoff * 2, 60_000);
          return false;
        }
        console.error('East DECA Prep: the server refused a change, skipping it', job, err);
      }
      queue.shift();
      persistQueue();
      backoff = 1000;
    }
    setSaveStatus('saved');
    return true;
  } finally {
    running = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void drain());
}

/** Waits up to `ms` for pending changes to reach the server. */
async function flush(ms = 4000): Promise<boolean> {
  if (!queue.length) return true;
  const done = drain();
  const timeout = new Promise<boolean>((r) => setTimeout(() => r(false), ms));
  const ok = await Promise.race([done, timeout]);
  return ok || queue.length === 0;
}

// ---------------------------------------------------------------- loading

async function fetchAll<T>(table: string, cluster: string, columns: string, order: string): Promise<T[]> {
  const out: T[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq('user_id', userId!)
      .eq('cluster', cluster)
      .order(order, { ascending: true })
      .range(from, from + page - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < page) return out;
  }
}

async function fetchProfile(): Promise<{ settings: Settings; current_cluster: string } | null> {
  const { data, error } = await supabase.from('profiles').select('settings, current_cluster').eq('user_id', userId!).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { settings: { ...DEFAULT_SETTINGS, ...(data.settings as Partial<Settings>) }, current_cluster: data.current_cluster };
}

async function fetchCluster(cluster: string, settings: Settings): Promise<AppState> {
  const [attempts, bookmarks, mocks, active] = await Promise.all([
    fetchAll<{ qid: string; choice: Attempt['choice']; correct: boolean; ts: number; ms: number; mode: Attempt['mode'] }>(
      'attempts', cluster, 'qid, choice, correct, ts, ms, mode', 'ts',
    ),
    fetchAll<{ qid: string }>('bookmarks', cluster, 'qid', 'created_at'),
    fetchAll<{ data: MockResult }>('mocks', cluster, 'data', 'finished_at'),
    supabase.from('active_mocks').select('data').eq('user_id', userId!).eq('cluster', cluster).maybeSingle(),
  ]);
  if (active.error) throw active.error;
  const s = emptyState();
  s.attempts = attempts.map((a) => ({ ...a, ts: Number(a.ts) }));
  s.bookmarks = bookmarks.map((b) => b.qid);
  s.mocks = mocks.map((m) => m.data);
  s.activeMock = (active.data?.data as ActiveMock | undefined) ?? null;
  s.settings = settings;
  return s;
}

/** Progress saved by the old local-only version of the app (Finance only), if any. */
function legacyProgress(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = parseState(JSON.parse(raw));
    return s.attempts.length || s.mocks.length || s.bookmarks.length ? s : null;
  } catch {
    return null;
  }
}

let settingsCache: Settings = { ...DEFAULT_SETTINGS };

async function showCluster(cluster: string): Promise<void> {
  setSession({ status: 'loading', cluster });
  await loadBank(cluster);
  const key = cacheKey(cluster);
  const flushed = await flush();
  let state: AppState | null = null;
  try {
    state = await fetchCluster(cluster, settingsCache);
  } catch (e) {
    // Offline: fall back to this device's cached copy.
    state = store.readCache(key);
    if (!state) throw e;
  }
  if (!flushed) {
    // Changes made on this device have not reached the server yet; keep showing them.
    const cached = store.readCache(key);
    if (cached && cached.attempts.length > state.attempts.length) state = cached;
  }
  if (cluster === 'finance' && !state.attempts.length && !state.mocks.length) {
    const legacy = legacyProgress();
    if (legacy) {
      legacy.settings = settingsCache;
      state = legacy;
      store.load(state, key);
      enqueue({ k: 'replace', cluster, state: legacy });
      try {
        localStorage.setItem(STORAGE_KEY + ':migrated', localStorage.getItem(STORAGE_KEY) ?? '');
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
  }
  store.load({ ...state, settings: settingsCache }, key);
}

function pickCluster(c: string | null | undefined): string {
  if (c && CLUSTERS.some((x) => x.id === c) && hasBank(c)) return c;
  return DEFAULT_CLUSTER;
}

let opening: { uid: string; p: Promise<void> } | null = null;

/** Called once the user is signed in. Safe to call repeatedly. */
export function openSession(uid: string, email: string): Promise<void> {
  if (userId === uid && session.status === 'ready') return Promise.resolve();
  if (opening?.uid === uid) return opening.p;
  const p = doOpen(uid, email).finally(() => {
    if (opening?.p === p) opening = null;
  });
  opening = { uid, p };
  return p;
}

async function doOpen(uid: string, email: string): Promise<void> {
  userId = uid;
  restoreQueue();
  store.setSink(undefined);
  setSession({ status: 'loading', cluster: null });
  try {
    void drain();
    let profile = await fetchProfile().catch(() => null);
    if (!profile) {
      profile = { settings: { ...DEFAULT_SETTINGS }, current_cluster: DEFAULT_CLUSTER };
      enqueue({ k: 'settings', settings: profile.settings });
    }
    settingsCache = profile.settings;
    const cluster = pickCluster(profile.current_cluster);
    await showCluster(cluster);
    store.setSink(sink);
    setSession({ status: 'ready', cluster, userId: uid, email });
  } catch (e) {
    console.error(e);
    setSession({ status: 'error', message: 'Couldn’t load your progress. Check your connection and try again.' });
  }
}

export async function switchCluster(cluster: string): Promise<void> {
  if (session.status !== 'ready' || session.cluster === cluster || !hasBank(cluster)) return;
  const { email } = session;
  const uid = session.userId;
  settingsCache = store.get().settings;
  store.setSink(undefined);
  try {
    await showCluster(cluster);
    store.setSink(sink);
    setSession({ status: 'ready', cluster, userId: uid, email });
    enqueue({ k: 'cluster', cluster });
  } catch (e) {
    console.error(e);
    setSession({ status: 'error', message: 'Couldn’t open that cluster. Check your connection and try again.' });
  }
}

/** Re-reads progress from the server, e.g. after studying on another device. */
export async function refresh(): Promise<void> {
  if (session.status !== 'ready' || queue.length) return;
  const { cluster } = session;
  try {
    const profile = await fetchProfile();
    if (profile) settingsCache = profile.settings;
    const state = await fetchCluster(cluster, settingsCache);
    if (session.status === 'ready' && session.cluster === cluster && !queue.length) {
      store.setSink(undefined);
      store.load(state, cacheKey(cluster));
      store.setSink(sink);
    }
  } catch {
    /* offline: keep what we have */
  }
}

let lastRefresh = Date.now();
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 60_000) {
      lastRefresh = Date.now();
      void refresh();
    }
  });
}

export function closeSession() {
  store.setSink(undefined);
  userId = null;
  queue = [];
  store.load(emptyState(), null);
  setSession({ status: 'idle' });
}

/** True while changes are waiting to be saved; used to warn before signing out. */
export function hasPendingChanges(): boolean {
  return queue.length > 0;
}
