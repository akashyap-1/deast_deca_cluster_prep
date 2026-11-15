import { useEffect, useMemo, useRef, useState } from 'react';
import { exams, areas, examLabel, visibleQuestions } from '../data/bank';
import { Feedback, QuestionView } from '../components/QuestionView';
import { Button, Card, Glyph, LINK, Toggle, cx } from '../components/ui';
import { activeFilterCount, filterPool, NO_FILTERS, pickRandom, type PracticeFilters } from '../lib/practice';
import { answeredToday, questionStats, streakDays } from '../lib/stats';
import { dueReviews, pickSmart, reviewQueueSize, type SmartPick } from '../lib/smart';
import { ProgressBar } from '../components/ui';
import { SessionBar } from '../components/SessionBar';
import { store, useAppState } from '../lib/storage';
import type { Letter, Question } from '../lib/types';
import { keyToLetter, useKeys } from '../lib/useKeys';

function filtersFromParams(params: URLSearchParams): PracticeFilters {
  const list = (k: string) => (params.get(k) ? params.get(k)!.split(',').filter(Boolean) : []);
  return {
    ...NO_FILTERS,
    piCodes: list('pi'),
    areas: list('area'),
    exams: list('exam'),
    missedOnly: params.get('missed') === '1',
    bookmarkedOnly: params.get('bookmarked') === '1',
  };
}

type Mode = 'smart' | 'custom';

export function PracticePage({ params }: { params: URLSearchParams }) {
  const state = useAppState();
  const [mode, setMode] = useState<Mode>(() =>
    activeFilterCount(filtersFromParams(params)) > 0 || params.get('mode') === 'custom' ? 'custom' : 'smart',
  );
  const [filters, setFilters] = useState<PracticeFilters>(() => filtersFromParams(params));
  const [showFilters, setShowFilters] = useState(() => activeFilterCount(filtersFromParams(params)) > 0);
  const questions = useMemo(() => visibleQuestions(state.settings.includeFlagged), [state.settings.includeFlagged]);
  const stats = useMemo(() => questionStats(state.attempts), [state.attempts]);
  // The pool is recomputed when filters change, not after every answer, so "unseen only"
  // doesn't yank the current question away while its feedback is showing.
  const pool = useMemo(
    () => filterPool(questions, filters, questionStats(store.get().attempts), state.bookmarks),
    [questions, filters, state.bookmarks],
  );

  const shown = useRef(new Set<string>());
  const [current, setCurrent] = useState<Question | null>(null);
  const [why, setWhy] = useState<SmartPick | null>(null);
  const [selected, setSelected] = useState<Letter | null>(null);
  const shownAt = useRef(Date.now());
  const [sessionStart] = useState(() => Date.now());
  const [tally, setTally] = useState({ answered: 0, correct: 0 });
  const [answeredAt, setAnsweredAt] = useState<number | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const isPhone = () => window.matchMedia('(max-width: 639.98px)').matches;
  const smooth = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth') as ScrollBehavior;

  // On phones the explanation lands below the fold; bring its top into view once it renders.
  useEffect(() => {
    if (selected && isPhone()) feedbackRef.current?.scrollIntoView({ behavior: smooth(), block: 'nearest' });
  }, [selected]);

  function next(m: Mode = mode) {
    let q: Question | null;
    if (m === 'smart') {
      const pick = pickSmart(questions, store.get().attempts, { exclude: shown.current });
      setWhy(pick);
      q = pick?.question ?? null;
    } else {
      setWhy(null);
      // Re-filter with fresh stats so "missed"/"unseen" reflect the answer just given.
      const fresh = filterPool(questions, filters, questionStats(store.get().attempts), store.get().bookmarks);
      q = pickRandom(
        fresh.filter((x) => x.id !== current?.id),
        shown.current,
      ) ?? (fresh.length ? fresh[0] : null);
    }
    if (q) shown.current.add(q.id);
    if (current && isPhone()) window.scrollTo({ top: 0 });
    setCurrent(q);
    setSelected(null);
    setAnsweredAt(null);
    shownAt.current = Date.now();
  }

  // New pool (custom mode) -> new question if the current one no longer fits.
  useEffect(() => {
    if (mode === 'custom' && current && !pool.some((q) => q.id === current.id)) next('custom');
  }, [pool]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    next(mode);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function answer(l: Letter) {
    if (!current || selected) return;
    setSelected(l);
    setAnsweredAt(Date.now());
    setTally((t) => ({ answered: t.answered + 1, correct: t.correct + (l === current.correct ? 1 : 0) }));
    store.recordAttempt({
      qid: current.id,
      choice: l,
      correct: l === current.correct,
      ts: Date.now(),
      ms: Date.now() - shownAt.current,
      mode: mode === 'smart' ? 'smart' : 'practice',
    });
  }

  useKeys((e) => {
    if (!current) return;
    const l = keyToLetter(e.key);
    if (l && !selected) {
      e.preventDefault();
      answer(l);
    } else if (e.key === 'Enter' && selected) {
      e.preventDefault();
      next();
    } else if (e.key.toLowerCase() === 's' && !l) {
      store.toggleBookmark(current.id);
    }
  });

  const nFilters = activeFilterCount(filters);
  const bookmarked = current ? state.bookmarks.includes(current.id) : false;
  const qs = current ? stats.get(current.id) : undefined;

  return (
    <div className="space-y-4">
      <DailyBar
        lead={
          <div className="inline-flex shrink-0 rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Practice mode">
            {(['smart', 'custom'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cx(
                  'rounded-md px-3 py-1.5 text-sm font-semibold transition',
                  mode === m
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                )}
              >
                {m === 'smart' ? 'Smart' : 'Custom'}
              </button>
            ))}
          </div>
        }
      >
        {mode === 'custom' && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                <span className="tnum font-semibold text-slate-900 dark:text-slate-100">{pool.length}</span> questions match
              </span>
              <Button variant="secondary" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters} className="!py-2">
                Filters{nFilters ? ` (${nFilters})` : ''}
              </Button>
            </div>
            {showFilters && <FilterPanel filters={filters} setFilters={setFilters} />}
          </>
        )}
      </DailyBar>

      {!current ? (
        <Card>
          <p className="text-center text-slate-600 dark:text-slate-400">
            No questions match these filters.{' '}
            <button className={LINK} onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </button>
          </p>
        </Card>
      ) : (
        <Card className="max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0">
          <QuestionView
            question={current}
            selected={selected}
            revealed={selected != null}
            onSelect={answer}
            header={
              <div className="mb-3 flex items-start justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <span className="font-semibold text-brand-700 dark:text-brand-400">{current.instructionalArea}</span>
                  <span>·</span>
                  <span>
                    {examLabel(current.exam)} #{current.number}
                  </span>
                  {qs && why?.reason !== 'new' && (
                    <>
                      <span>·</span>
                      <span>
                        seen {qs.attempts}× ({qs.correct} right)
                      </span>
                    </>
                  )}
                  {why ? (
                    <ReasonChip pick={why} />
                  ) : (
                    !qs && (
                      <span className="rounded bg-sky-100 px-1.5 font-semibold text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
                        new
                      </span>
                    )
                  )}
                </div>
                <BookmarkButton on={bookmarked} onClick={() => store.toggleBookmark(current.id)} />
              </div>
            }
          />
          {selected && (
            <>
              {/* On phones the session bar carries Next; this one is for larger screens. */}
              <div className="mt-4 hidden items-center justify-between gap-3 sm:flex">
                <span className="hidden text-xs text-slate-500 sm:inline dark:text-slate-400">
                  <kbd>Enter</kbd> next · <kbd>S</kbd> bookmark
                </span>
                <Button onClick={() => next()} className="w-full sm:w-auto">
                  Next question <Glyph name="next" />
                </Button>
              </div>
              <div ref={feedbackRef} className="scroll-mb-40 sm:scroll-mb-20">
                <Feedback question={current} selected={selected} />
              </div>
            </>
          )}
          {!selected && (
            <p className="mt-4 hidden text-xs text-slate-500 sm:block">
              Answer with <kbd>A</kbd>–<kbd>D</kbd> or <kbd>1</kbd>–<kbd>4</kbd>
            </p>
          )}
        </Card>
      )}
      <SessionBar
        startedAt={sessionStart}
        timer={{ label: 'This question', from: shownAt.current, stoppedAt: answeredAt }}
        score={{
          label: 'Session accuracy',
          value: tally.answered ? `${tally.correct}/${tally.answered} · ${Math.round((tally.correct / tally.answered) * 100)}%` : '—',
        }}
        source={current ? `${examLabel(current.exam)} #${current.number}` : undefined}
        action={selected ? { label: 'Next question', onClick: () => next() } : null}
      />
    </div>
  );
}

const REASON_STYLE: Record<SmartPick['reason'], string> = {
  review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  weak: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  new: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  refresh: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function ReasonChip({ pick }: { pick: SmartPick }) {
  return <span className={cx('rounded px-1.5 font-semibold', REASON_STYLE[pick.reason])}>{pick.detail}</span>;
}

/** Today's progress toward the daily goal, the streak, and reviews waiting. `lead` sits at the start of the row. */
export function DailyBar({ lead, children }: { lead?: React.ReactNode; children?: React.ReactNode }) {
  const state = useAppState();
  const goal = state.settings.dailyGoal;
  const today = answeredToday(state.attempts);
  const streak = streakDays(state.attempts, goal);
  const questions = visibleQuestions(state.settings.includeFlagged);
  const stats = questionStats(state.attempts);
  const due = dueReviews(questions, stats, Date.now()).length;
  const queue = reviewQueueSize(questions, stats);
  return (
    <Card className="!p-3 sm:!px-5 sm:!py-4">
      <div className="flex items-center gap-4 sm:gap-6">
        {lead}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 text-xs sm:text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Today</span>
            <span className="tnum text-slate-600 dark:text-slate-300">
              {today >= goal ? (
                <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
                  <Glyph name="check" className="h-3.5 w-3.5" /> {today}/{goal}
                </span>
              ) : (
                <>
                  <span className="font-semibold text-slate-900 dark:text-white">{today}</span>/{goal}
                </>
              )}
            </span>
          </div>
          <ProgressBar value={today} max={goal} className="mt-1.5" />
        </div>
        <div className="hidden shrink-0 gap-5 text-sm sm:flex">
          <span className="tnum text-slate-600 dark:text-slate-300" title="Days in a row you met your daily goal">
            <span className="font-semibold text-slate-900 dark:text-white">{streak}</span> day streak
          </span>
          <span className="tnum text-slate-600 dark:text-slate-300" title={`${queue} missed questions are in the review cycle`}>
            <span className="font-semibold text-slate-900 dark:text-white">{due}</span> reviews due
          </span>
        </div>
      </div>
      <div className="tnum mt-2 flex gap-4 text-xs text-slate-600 sm:hidden dark:text-slate-400">
        <span>
          <span className="font-semibold text-slate-900 dark:text-white">{streak}</span> day streak
        </span>
        <span>
          <span className="font-semibold text-slate-900 dark:text-white">{due}</span> reviews due
        </span>
      </div>
      {children && <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-800">{children}</div>}
    </Card>
  );
}

export function BookmarkButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={on ? 'Remove bookmark (S)' : 'Bookmark (S)'}
      className={cx(
        '-m-1 grid h-10 w-10 shrink-0 place-items-center rounded-lg transition active:bg-slate-100 dark:active:bg-slate-800',
        on ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" strokeLinejoin="round" />
      </svg>
      <span className="sr-only">{on ? 'Remove bookmark' : 'Bookmark'}</span>
    </button>
  );
}

function ChipToggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition sm:py-1',
        on
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-brand-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
      )}
    >
      {children}
    </button>
  );
}

function FilterPanel({
  filters,
  setFilters,
}: {
  filters: PracticeFilters;
  setFilters: (f: PracticeFilters) => void;
}) {
  const toggle = (key: 'areas' | 'exams' | 'piCodes', v: string) => {
    const list = filters[key];
    setFilters({ ...filters, [key]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] });
  };
  return (
    <div className="mt-4 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
      <div className="grid gap-x-6 sm:grid-cols-3">
        <Toggle label="Missed only" checked={filters.missedOnly} onChange={(v) => setFilters({ ...filters, missedOnly: v, unseenOnly: v ? false : filters.unseenOnly })} />
        <Toggle label="Unseen only" checked={filters.unseenOnly} onChange={(v) => setFilters({ ...filters, unseenOnly: v, missedOnly: v ? false : filters.missedOnly })} />
        <Toggle label="Bookmarked only" checked={filters.bookmarkedOnly} onChange={(v) => setFilters({ ...filters, bookmarkedOnly: v })} />
      </div>
      {filters.piCodes.length > 0 && (
        <FilterGroup title="Performance indicators">
          {filters.piCodes.map((p) => (
            <ChipToggle key={p} on onClick={() => toggle('piCodes', p)}>
              <span className="inline-flex items-center gap-1">
                {p} <Glyph name="close" className="h-3 w-3" />
              </span>
            </ChipToggle>
          ))}
        </FilterGroup>
      )}
      <FilterGroup title="Instructional area">
        {areas.map((a) => (
          <ChipToggle key={a} on={filters.areas.includes(a)} onClick={() => toggle('areas', a)}>
            {a}
          </ChipToggle>
        ))}
      </FilterGroup>
      <FilterGroup title="Exam">
        {exams
          .filter((e) => !e.duplicateOf)
          .map((e) => (
            <ChipToggle key={e.id} on={filters.exams.includes(e.id)} onClick={() => toggle('exams', e.id)}>
              {e.label}
            </ChipToggle>
          ))}
      </FilterGroup>
      {activeFilterCount(filters) > 0 && (
        <Button variant="ghost" onClick={() => setFilters(NO_FILTERS)}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
