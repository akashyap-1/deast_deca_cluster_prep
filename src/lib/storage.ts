// The in-memory progress store for the signed-in user's current cluster. Every change is
// reported to a sink (src/lib/sync.ts writes it to Supabase) and cached in localStorage so the
// app opens instantly. The JSON blob is also the export/import file format.
import { useSyncExternalStore } from 'react';
import type { Letter } from './types';

export type AttemptMode = 'smart' | 'practice' | 'mock';

export interface Attempt {
  qid: string;
  choice: Letter;
  correct: boolean;
  /** Epoch ms when answered. */
  ts: number;
  /** Time spent on the question, ms. */
  ms: number;
  mode: AttemptMode;
}

export interface MockAnswer {
  qid: string;
  choice: Letter | null;
  flagged: boolean;
  ms: number;
}

export interface MockResult {
  id: string;
  kind: 'replay' | 'mix';
  examId?: string;
  label: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  timeLimitMs: number;
  answers: MockAnswer[];
  score: number;
  total: number;
}

export interface ActiveMock {
  id: string;
  kind: 'replay' | 'mix';
  examId?: string;
  label: string;
  startedAt: number;
  timeLimitMs: number;
  answers: MockAnswer[];
  current: number;
}

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  dailyGoal: number;
  theme: Theme;
  /** Show questions the parser flagged as needsReview. Off by default. */
  includeFlagged: boolean;
  /** Show the timer in the session bar on practice and mock screens. */
  showTimer: boolean;
}

export interface AppState {
  app: 'kash2finance';
  version: 1;
  attempts: Attempt[];
  bookmarks: string[];
  mocks: MockResult[];
  activeMock: ActiveMock | null;
  settings: Settings;
}

export const STORAGE_KEY = 'kash2finance:v1';

export const DEFAULT_SETTINGS: Settings = { dailyGoal: 25, theme: 'dark', includeFlagged: false, showTimer: true };

export function emptyState(): AppState {
  return {
    app: 'kash2finance',
    version: 1,
    attempts: [],
    bookmarks: [],
    mocks: [],
    activeMock: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export function memoryKV(): KV {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function defaultKV(): KV {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      ls.getItem(STORAGE_KEY);
      return ls;
    }
  } catch {
    /* blocked storage: fall through */
  }
  return memoryKV();
}

const LETTER_SET = new Set(['A', 'B', 'C', 'D']);

/** Validates and normalizes unknown JSON into AppState. Throws with a readable message. */
export function parseState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') throw new Error('Not an East DECA Prep progress file.');
  const r = raw as Record<string, unknown>;
  if (r.app !== 'kash2finance') throw new Error('Not an East DECA Prep progress file (missing "app" marker).');
  if (r.version !== 1) throw new Error(`Unsupported progress file version: ${String(r.version)}`);
  const s = emptyState();
  if (!Array.isArray(r.attempts)) throw new Error('Progress file has no attempts list.');
  s.attempts = r.attempts.filter(
    (a): a is Attempt =>
      !!a &&
      typeof a.qid === 'string' &&
      LETTER_SET.has(a.choice) &&
      typeof a.correct === 'boolean' &&
      typeof a.ts === 'number' &&
      typeof a.ms === 'number',
  );
  for (const a of s.attempts) if (!['smart', 'practice', 'mock'].includes(a.mode)) a.mode = 'practice';
  s.bookmarks = Array.isArray(r.bookmarks) ? r.bookmarks.filter((b): b is string => typeof b === 'string') : [];
  s.mocks = Array.isArray(r.mocks)
    ? (r.mocks as MockResult[]).filter((m) => m && typeof m.id === 'string' && Array.isArray(m.answers))
    : [];
  s.activeMock =
    r.activeMock && typeof r.activeMock === 'object' && Array.isArray((r.activeMock as ActiveMock).answers)
      ? (r.activeMock as ActiveMock)
      : null;
  const st = (r.settings ?? {}) as Partial<Settings>;
  s.settings = {
    dailyGoal:
      typeof st.dailyGoal === 'number' && st.dailyGoal >= 1 ? Math.min(500, Math.round(st.dailyGoal)) : 25,
    theme: st.theme === 'light' || st.theme === 'system' ? st.theme : 'dark',
    includeFlagged: st.includeFlagged === true,
    showTimer: st.showTimer !== false,
  };
  return s;
}

/** A change to progress, sent to the sink so it can be saved remotely. */
export type Op =
  | { t: 'attempts'; items: Attempt[] }
  | { t: 'bookmark'; qid: string; on: boolean }
  | { t: 'settings'; settings: Settings }
  | { t: 'activeMock'; mock: ActiveMock | null }
  | { t: 'mock'; result: MockResult }
  | { t: 'reset' }
  | { t: 'replace'; state: AppState };

export function createStore(kv: KV = defaultKV(), sink?: (op: Op) => void) {
  let sinkFn = sink;
  let cacheKey: string | null = STORAGE_KEY;
  let state: AppState = emptyState();
  try {
    const raw = kv.getItem(STORAGE_KEY);
    if (raw) state = parseState(JSON.parse(raw));
  } catch (e) {
    console.warn('East DECA Prep: could not read saved progress, starting fresh', e);
  }
  const listeners = new Set<() => void>();

  function set(next: AppState, ...ops: Op[]) {
    state = next;
    if (cacheKey) {
      try {
        kv.setItem(cacheKey, JSON.stringify(state));
      } catch (e) {
        console.warn('East DECA Prep: could not cache progress', e);
      }
    }
    if (sinkFn) for (const op of ops) sinkFn(op);
    listeners.forEach((l) => l());
  }

  return {
    get: () => state,
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    setSink(fn: ((op: Op) => void) | undefined) {
      sinkFn = fn;
    },
    /** Reads the cached copy for a key (user + cluster), or null. Does not change the store. */
    readCache(key: string): AppState | null {
      try {
        const raw = kv.getItem(key);
        return raw ? parseState(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    /** Swaps in state loaded from elsewhere (the server or a cache) without reporting changes. */
    load(next: AppState, key: string | null) {
      cacheKey = key;
      set(next);
    },
    recordAttempt(a: Attempt) {
      set({ ...state, attempts: [...state.attempts, a] }, { t: 'attempts', items: [a] });
    },
    toggleBookmark(qid: string) {
      const has = state.bookmarks.includes(qid);
      set(
        { ...state, bookmarks: has ? state.bookmarks.filter((b) => b !== qid) : [...state.bookmarks, qid] },
        { t: 'bookmark', qid, on: !has },
      );
    },
    setSettings(patch: Partial<Settings>) {
      const settings = { ...state.settings, ...patch };
      set({ ...state, settings }, { t: 'settings', settings });
    },
    setActiveMock(m: ActiveMock | null) {
      set({ ...state, activeMock: m }, { t: 'activeMock', mock: m });
    },
    finishMock(result: MockResult, attempts: Attempt[]) {
      set(
        { ...state, activeMock: null, mocks: [...state.mocks, result], attempts: [...state.attempts, ...attempts] },
        { t: 'mock', result },
        { t: 'attempts', items: attempts },
        { t: 'activeMock', mock: null },
      );
    },
    exportJSON(): string {
      return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
    },
    /** Replaces all progress with the file's contents. Throws on invalid input. */
    importJSON(text: string) {
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch {
        throw new Error('That file is not valid JSON.');
      }
      const next = parseState(raw);
      set(next, { t: 'replace', state: next }, { t: 'settings', settings: next.settings });
    },
    /** Clears progress; keeps settings unless told otherwise. */
    reset(keepSettings = true) {
      const fresh = emptyState();
      if (keepSettings) fresh.settings = state.settings;
      set(fresh, { t: 'reset' }, ...(keepSettings ? [] : [{ t: 'settings', settings: fresh.settings } as Op]));
    },
  };
}

export type Store = ReturnType<typeof createStore>;

export const store = createStore();

export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
