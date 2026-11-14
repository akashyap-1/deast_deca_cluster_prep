// The stats bar pinned to the bottom of the practice and mock screens: session time, a timer the
// student can hide, session accuracy (or progress during a mock) and where the question came from.
import { useEffect, useState, type ReactNode } from 'react';
import { clusterById } from '../data/clusters';
import { formatDuration } from '../lib/mock';
import { store, useAppState } from '../lib/storage';
import { useSession } from '../lib/sync';
import { Button, Glyph, cx } from './ui';

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function Item({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx('min-w-0', className)}>
      <div className="text-[0.68rem] font-medium text-slate-500 dark:text-slate-400">{label}</div>
      <div className="tnum truncate text-sm font-semibold text-slate-900 dark:text-white">{children}</div>
    </div>
  );
}

interface Props {
  /** When this session started (epoch ms). */
  startedAt: number;
  /**
   * The timer. Counts up from `from` (time on this question; frozen at `stoppedAt` once answered),
   * or down to `until` (time left in a mock; urgent in the last `urgentMs`).
   */
  timer: { label: string; from?: number; stoppedAt?: number | null; until?: number; urgentMs?: number };
  /** e.g. { label: 'Session accuracy', value: '8/10 · 80%' } */
  score: { label: string; value: ReactNode };
  /** Source of the current question, e.g. "2024 ICDC #12". */
  source?: string;
  /** Primary action shown in the bar on phones, where the page's own button can sit below the fold. */
  action?: { label: string; onClick: () => void } | null;
}

export function SessionBar({ startedAt, timer, score, source, action }: Props) {
  const now = useNow();
  const session = useSession();
  const { showTimer } = useAppState().settings;
  const cluster = session.status === 'ready' ? clusterById(session.cluster) : null;
  const ms = timer.until != null ? timer.until - now : (timer.stoppedAt ?? now) - (timer.from ?? now);
  const urgent = timer.until != null && timer.urgentMs != null && ms < timer.urgentMs;
  const timerVisible = showTimer || urgent;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm lg:bottom-0 lg:left-64 dark:border-slate-800 dark:bg-slate-900/95"
      role="region"
      aria-label="Session stats"
    >
      {action && (
        <div className="px-4 pt-2 sm:hidden">
          <Button onClick={action.onClick} className="w-full">
            {action.label} <Glyph name="next" />
          </Button>
        </div>
      )}
      <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-2 sm:gap-8 sm:px-6 lg:px-10">
        <Item label="Session">{formatDuration(now - startedAt)}</Item>
        <div className="flex min-w-0 items-end gap-1.5">
          <Item label={timer.label} className={cx(!timerVisible && 'opacity-60')}>
            {timerVisible ? (
              <span className={cx(urgent && 'text-rose-600 dark:text-rose-400')}>{formatDuration(Math.max(0, ms))}</span>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">Hidden</span>
            )}
          </Item>
          {!urgent && (
            <button
              type="button"
              onClick={() => store.setSettings({ showTimer: !showTimer })}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={showTimer ? 'Hide timer' : 'Show timer'}
              title={showTimer ? 'Hide timer' : 'Show timer'}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {showTimer ? (
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-3.2 4.2M6.3 6.3C4.2 7.7 2.7 9.8 2 12c1 2.5 5 7 10 7a9.6 9.6 0 0 0 4.2-1" />
                ) : (
                  <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                )}
              </svg>
            </button>
          )}
        </div>
        <Item label={score.label}>{score.value}</Item>
        <Item label="From" className="ml-auto hidden text-right sm:block">
          {cluster?.short}
          {source && <span className="font-normal text-slate-500 dark:text-slate-400"> · {source}</span>}
        </Item>
        <Item label="Cluster" className="ml-auto text-right sm:hidden">
          {cluster?.short}
        </Item>
      </div>
    </div>
  );
}
