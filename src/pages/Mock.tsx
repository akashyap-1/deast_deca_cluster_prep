import { useEffect, useMemo, useRef, useState } from 'react';
import { byId, examById, examLabel, exams, visibleQuestions } from '../data/bank';
import { SessionBar } from '../components/SessionBar';
import { BookmarkButton } from './Practice';
import { Feedback, QuestionView } from '../components/QuestionView';
import { Button, Card, ProgressBar, cx, pct, Glyph, LINK } from '../components/ui';
import {
  areaDistribution,
  buildMix,
  buildReplay,
  formatDuration,
  MOCK_TIME_MS,
  scoreMock,
} from '../lib/mock';
import { navigate } from '../lib/router';
import { store, useAppState, type ActiveMock, type MockAnswer, type MockResult } from '../lib/storage';
import { clusterById } from '../data/clusters';
import { useSession } from '../lib/sync';
import type { Question } from '../lib/types';
import type { Letter } from '../lib/types';
import { keyToLetter, useKeys } from '../lib/useKeys';

export function MockPage({ params }: { params: URLSearchParams }) {
  const state = useAppState();
  const resultId = params.get('result');
  if (state.activeMock) return <Runner mock={state.activeMock} />;
  if (resultId) {
    const r = state.mocks.find((m) => m.id === resultId);
    if (r) return <Results result={r} />;
  }
  return <Setup />;
}

// ------------------------------------------------------------------ setup

function Setup() {
  const state = useAppState();
  const replayable = useMemo(
    () => exams.filter((e) => !e.duplicateOf).sort((a, b) => b.year - a.year || a.label.localeCompare(b.label)),
    [],
  );
  const [examId, setExamId] = useState(replayable[0]?.id ?? '');
  const visible = useMemo(() => visibleQuestions(state.settings.includeFlagged), [state.settings.includeFlagged]);
  const dist = useMemo(() => areaDistribution(exams, byId), []);
  const takenIds = new Set(state.mocks.map((m) => m.examId).filter(Boolean));

  function start(kind: 'replay' | 'mix') {
    const visibleIds = new Set(visible.map((q) => q.id));
    let ids: string[];
    let label: string;
    if (kind === 'replay') {
      const e = examById.get(examId)!;
      ids = buildReplay(e, visibleIds);
      label = `${e.label} (replay)`;
    } else {
      ids = buildMix(visible, dist).map((q) => q.id);
      label = 'Mixed exam';
    }
    const m: ActiveMock = {
      id: `mock-${Date.now()}`,
      kind,
      examId: kind === 'replay' ? examId : undefined,
      label,
      startedAt: Date.now(),
      timeLimitMs: MOCK_TIME_MS,
      answers: ids.map((qid) => ({ qid, choice: null, flagged: false, ms: 0 })),
      current: 0,
    };
    store.setActiveMock(m);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Mock exam</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          100 questions, 60 minutes, no feedback until you submit, just like the real test.
        </p>
      </div>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-bold">Replay a real exam</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Questions in their original order.</p>
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
          >
            {replayable.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
                {takenIds.has(e.id) ? ' (taken)' : ''}
              </option>
            ))}
          </select>
          <Button className="mt-4 w-full" onClick={() => start('replay')} disabled={!examId}>
            Start replay
          </Button>
        </Card>
        <Card>
          <h2 className="font-bold">Mixed exam</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            A shuffled mix from all {exams.filter((e) => !e.duplicateOf).length} exams, matching the real mix of
            instructional areas.
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {[...dist.entries()]
              .filter(([, n]) => n > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([a, n]) => (
                <span key={a} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {a} {n}
                </span>
              ))}
          </div>
          <Button className="mt-4 w-full" onClick={() => start('mix')}>
            Start mixed exam
          </Button>
        </Card>
      </div>
      <History mocks={state.mocks} />
    </div>
  );
}

function History({ mocks }: { mocks: MockResult[] }) {
  if (!mocks.length) return null;
  return (
    <Card>
      <h2 className="mb-3 font-bold">History</h2>
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {[...mocks].reverse().map((m) => (
          <li key={m.id}>
            <a
              href={`#/mock?result=${m.id}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand-700 dark:hover:text-brand-400"
            >
              <span>
                <span className="font-semibold">{m.label}</span>
                <span className="block text-xs text-slate-500">
                  {new Date(m.finishedAt).toLocaleString()} · {formatDuration(m.durationMs)}
                </span>
              </span>
              <span className="text-right font-bold tabular-nums">
                {m.score}/{m.total}
                <span className="block text-xs font-normal text-slate-500">{pct(m.total ? m.score / m.total : null)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// ------------------------------------------------------------------ runner

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function Runner({ mock }: { mock: ActiveMock }) {
  const { bookmarks } = useAppState();
  const now = useNow();
  const remaining = mock.startedAt + mock.timeLimitMs - now;
  const [confirming, setConfirming] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const enteredAt = useRef(Date.now());
  const cur = mock.answers[mock.current];
  const q = byId.get(cur.qid)!;
  const answered = mock.answers.filter((a) => a.choice).length;
  const flagged = mock.answers.filter((a) => a.flagged).length;
  const session = useSession();
  const clusterShort = session.status === 'ready' ? clusterById(session.cluster).short : '';

  // Focus mode: on phones the exam takes the whole screen (see html[data-focus] in index.css).
  useEffect(() => {
    document.documentElement.dataset.focus = '1';
    return () => {
      delete document.documentElement.dataset.focus;
    };
  }, []);
  // The question grid opens as a sheet on phones; Escape closes it.
  useEffect(() => {
    if (!showGrid) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setShowGrid(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGrid]);

  /** Adds time spent on the current question and applies a change. */
  function commit(change: (answers: MockAnswer[]) => { answers: MockAnswer[]; current?: number }) {
    const m = store.get().activeMock;
    if (!m) return;
    const spent = Date.now() - enteredAt.current;
    enteredAt.current = Date.now();
    const answers = m.answers.map((a, i) => (i === m.current ? { ...a, ms: a.ms + spent } : a));
    const r = change(answers);
    store.setActiveMock({ ...m, answers: r.answers, current: r.current ?? m.current });
  }

  const choose = (l: Letter) =>
    commit((answers) => ({ answers: answers.map((a, i) => (i === mock.current ? { ...a, choice: l } : a)) }));
  const toggleFlag = () =>
    commit((answers) => ({ answers: answers.map((a, i) => (i === mock.current ? { ...a, flagged: !a.flagged } : a)) }));
  const go = (i: number) => {
    if (i < 0 || i >= mock.answers.length) return;
    commit((answers) => ({ answers, current: i }));
    setShowGrid(false);
    window.scrollTo({ top: 0 });
  };

  function submit() {
    const m = store.get().activeMock;
    if (!m) return;
    const finishedAt = Date.now();
    const answers = m.answers.map((a, i) =>
      i === m.current ? { ...a, ms: a.ms + (finishedAt - enteredAt.current) } : a,
    );
    const s = scoreMock(answers, byId);
    const result: MockResult = {
      id: m.id,
      kind: m.kind,
      examId: m.examId,
      label: m.label,
      startedAt: m.startedAt,
      finishedAt,
      durationMs: Math.min(finishedAt - m.startedAt, m.timeLimitMs),
      timeLimitMs: m.timeLimitMs,
      answers,
      score: s.score,
      total: s.total,
    };
    const attempts = answers
      .filter((a) => a.choice)
      .map((a) => ({
        qid: a.qid,
        choice: a.choice!,
        correct: a.choice === byId.get(a.qid)?.correct,
        ts: finishedAt,
        ms: a.ms,
        mode: 'mock' as const,
      }));
    store.finishMock(result, attempts);
    navigate(`/mock?result=${m.id}`);
  }

  // Time's up -> submit automatically.
  useEffect(() => {
    if (remaining <= 0) submit();
  }, [remaining <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  useKeys((e) => {
    if (confirming || showGrid) return;
    const l = keyToLetter(e.key);
    if (l) {
      e.preventDefault();
      choose(l);
    } else if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      go(mock.current + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(mock.current - 1);
    } else if (e.key.toLowerCase() === 'f') {
      toggleFlag();
    } else if (e.key.toLowerCase() === 's') {
      store.toggleBookmark(cur.qid);
    }
  });

  const low = remaining < 5 * 60 * 1000;
  return (
    <div className="space-y-4">
      <div className="focus-top sticky top-[calc(52px+env(safe-area-inset-top))] z-10 -mx-4 -mt-4 border-b border-slate-200 bg-slate-100/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:-mt-6 sm:px-6 lg:top-0 lg:-mx-10 lg:-mt-8 lg:px-10 dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-3">
          <a
            href="#/practice"
            className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 active:bg-slate-200 lg:hidden dark:text-slate-400 dark:active:bg-slate-800"
            aria-label="Leave exam (it keeps running)"
            title="Leave exam (it keeps running)"
          >
            <Glyph name="close" className="h-5 w-5" />
          </a>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{mock.label}</div>
            <div className="tnum truncate text-xs text-slate-500">
              {clusterShort && <span className="lg:hidden">{clusterShort} · </span>}
              {answered}/{mock.answers.length} answered · {flagged} flagged
            </div>
          </div>
          <div className="flex items-center gap-2">
            {low && (
              <span className="tnum rounded-lg bg-rose-100 px-2.5 py-1 text-sm font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300" aria-label="Time remaining">
                {formatDuration(remaining)} left
              </span>
            )}
            <Button
              onClick={() => {
                setConfirming(true);
                window.scrollTo({ top: 0 });
              }}
            >
              Submit
            </Button>
          </div>
        </div>
        <ProgressBar className="mt-2 !h-1" value={answered} max={mock.answers.length} />
      </div>

      {confirming && (
        <Card className="border-brand-300 dark:border-brand-800">
          <p className="font-semibold">Submit the exam?</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {mock.answers.length - answered > 0
              ? `${mock.answers.length - answered} question(s) are unanswered and will be marked wrong.`
              : 'All questions answered.'}
            {flagged > 0 && ` ${flagged} flagged.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={submit}>Submit now</Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Keep working
            </Button>
            <Button
              variant="ghost"
              className="sm:ml-auto"
              onClick={() => {
                if (window.confirm('Abandon this mock exam? Nothing from it will be saved.')) store.setActiveMock(null);
              }}
            >
              Abandon exam
            </Button>
          </div>
        </Card>
      )}

      <Card className="max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0">
        <QuestionView
          question={q}
          selected={cur.choice}
          revealed={false}
          onSelect={choose}
          header={
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-bold">
                Question {mock.current + 1} <span className="font-normal text-slate-500">of {mock.answers.length}</span>
              </span>
              <span className="flex items-center gap-1">
              <BookmarkButton on={bookmarks.includes(q.id)} onClick={() => store.toggleBookmark(q.id)} />
              <button
                type="button"
                onClick={toggleFlag}
                aria-pressed={cur.flagged}
                className={cx(
                  'rounded-lg px-3 py-2 text-xs font-semibold ring-1 transition sm:px-2.5 sm:py-1',
                  cur.flagged
                    ? 'bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-700'
                    : 'text-slate-500 ring-slate-300 hover:bg-slate-100 dark:ring-slate-600 dark:hover:bg-slate-800',
                )}
              >
                <span className="flex items-center gap-1">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={cur.flagged ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 21V4h11l-1.5 4L16 12H5" />
                  </svg>
                  {cur.flagged ? 'Flagged' : 'Flag'}
                </span>
              </button>
              </span>
            </div>
          }
        />
        <div className="mt-5 hidden items-center justify-between gap-2 sm:flex">
          <Button variant="secondary" onClick={() => go(mock.current - 1)} disabled={mock.current === 0}>
            <Glyph name="prev" /> Prev
          </Button>
          <span className="text-xs text-slate-500">
            <kbd>A</kbd>–<kbd>D</kbd> answer · <kbd>←</kbd> <kbd>→</kbd> move · <kbd>F</kbd> flag · <kbd>S</kbd> save
          </span>
          <Button
            variant="secondary"
            onClick={() => go(mock.current + 1)}
            disabled={mock.current === mock.answers.length - 1}
          >
            Next <Glyph name="next" />
          </Button>
        </div>
      </Card>

      <Card className="hidden sm:block">
        <QuestionGrid mock={mock} go={go} />
      </Card>
      {showGrid && (
        <div className="fixed inset-0 z-40 sm:hidden" role="dialog" aria-modal="true" aria-label="All questions">
          <button type="button" className="sheet-backdrop absolute inset-0 bg-slate-950/60" aria-label="Close" onClick={() => setShowGrid(false)} />
          <div className="sheet absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-white px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.25)] dark:bg-slate-900">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">All questions</h2>
              <button
                type="button"
                onClick={() => setShowGrid(false)}
                className="-mr-2 grid h-10 w-10 place-items-center rounded-lg text-slate-500 active:bg-slate-100 dark:active:bg-slate-800"
                aria-label="Close"
              >
                <Glyph name="close" className="h-5 w-5" />
              </button>
            </div>
            <QuestionGrid mock={mock} go={go} />
          </div>
        </div>
      )}
      <SessionBar
        startedAt={mock.startedAt}
        timer={{ label: 'Time left', until: mock.startedAt + mock.timeLimitMs, urgentMs: 5 * 60 * 1000 }}
        score={{ label: 'Answered', value: `${answered}/${mock.answers.length}${flagged ? ` · ${flagged} flagged` : ''}` }}
        source={`${examLabel(q.exam)} #${q.number}`}
        controls={
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
            <Button variant="secondary" onClick={() => go(mock.current - 1)} disabled={mock.current === 0} className="!py-3">
              <Glyph name="prev" /> Prev
            </Button>
            <Button variant="secondary" onClick={() => setShowGrid(true)} className="tnum !px-3.5 !py-3" aria-label={`All questions (on ${mock.current + 1})`}>
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" strokeLinejoin="round" />
              </svg>
              {mock.current + 1}
            </Button>
            {mock.current === mock.answers.length - 1 ? (
              <Button
                onClick={() => {
                  setConfirming(true);
                  window.scrollTo({ top: 0 });
                }}
                className="!py-3"
              >
                Finish
              </Button>
            ) : (
              <Button onClick={() => go(mock.current + 1)} className="!py-3">
                Next <Glyph name="next" />
              </Button>
            )}
          </div>
        }
      />
    </div>
  );
}

function QuestionGrid({ mock, go }: { mock: ActiveMock; go: (i: number) => void }) {
  return (
    <>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
        <Legend className="bg-brand-600" label="answered" />
        <Legend className="bg-amber-400" label="flagged" />
        <Legend className="bg-slate-200 dark:bg-slate-700" label="unanswered" />
      </div>
      <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-20 sm:gap-1">
        {mock.answers.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={`Question ${i + 1}${a.choice ? ', answered' : ''}${a.flagged ? ', flagged' : ''}`}
            aria-current={i === mock.current ? 'step' : undefined}
            className={cx(
              'relative aspect-square rounded-lg text-xs font-semibold tabular-nums sm:rounded sm:text-[0.65rem]',
              a.choice ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
              i === mock.current && 'ring-2 ring-slate-900 ring-offset-1 dark:ring-white dark:ring-offset-slate-900',
            )}
          >
            {i + 1}
            {a.flagged && <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-amber-400" />}
          </button>
        ))}
      </div>
    </>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={cx('h-3 w-3 rounded', className)} />
      {label}
    </span>
  );
}

// ------------------------------------------------------------------ results

type ReviewFilter = 'all' | 'wrong' | 'skipped' | 'flagged';

function Results({ result }: { result: MockResult }) {
  const s = useMemo(() => scoreMock(result.answers, byId), [result]);
  const [filter, setFilter] = useState<ReviewFilter>('wrong');
  const rows = result.answers
    .map((a, i) => ({ a, i, q: byId.get(a.qid) }))
    .filter((r) => r.q)
    .filter((r) =>
      filter === 'all'
        ? true
        : filter === 'flagged'
          ? r.a.flagged
          : filter === 'skipped'
            ? !r.a.choice
            : r.a.choice != null && r.a.choice !== r.q!.correct,
    );
  const counts: Record<ReviewFilter, number> = {
    wrong: result.answers.filter((a) => a.choice && a.choice !== byId.get(a.qid)?.correct).length,
    skipped: result.answers.filter((a) => !a.choice).length,
    flagged: result.answers.filter((a) => a.flagged).length,
    all: result.answers.length,
  };
  const [open, setOpen] = useState<number | null>(null);
  const ratio = result.total ? result.score / result.total : 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <a href="#/mock" className={cx(LINK, 'inline-flex items-center gap-1 text-sm')}>
          <Glyph name="prev" /> Mock exams
        </a>
      </div>
      <Card>
        <div className="text-sm text-slate-500">{result.label}</div>
        <div className="mt-2 flex flex-wrap items-end gap-x-8 gap-y-3">
          <div>
            <div className="text-4xl font-extrabold tabular-nums">
              {result.score}
              <span className="text-xl text-slate-400">/{result.total}</span>
            </div>
            <div className={cx('font-semibold', ratio >= 0.7 ? 'text-emerald-600' : 'text-rose-600')}>{pct(ratio)}</div>
          </div>
          <div className="text-sm">
            <div>
              <span className="text-slate-500">Time used</span>{' '}
              <span className="font-semibold tabular-nums">
                {formatDuration(result.durationMs)} / {formatDuration(result.timeLimitMs)}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Answered</span>{' '}
              <span className="font-semibold tabular-nums">
                {s.answered}/{result.total}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Finished</span> {new Date(result.finishedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 font-bold">By instructional area</h2>
        <div className="space-y-2">
          {s.byArea.map((g) => (
            <div key={g.area} className="grid grid-cols-[1fr_3rem] items-center gap-x-3 text-sm sm:grid-cols-[15rem_1fr_3rem]">
              <span className="truncate">{g.area}</span>
              <ProgressBar value={g.correct} max={g.total} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
              <span className="text-right tabular-nums text-slate-600 dark:text-slate-400">
                {g.correct}/{g.total}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card className="max-sm:-mx-4 max-sm:rounded-none max-sm:border-x-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Review</h2>
          <div className="grid w-full grid-cols-4 rounded-lg bg-slate-100 p-1 text-sm sm:inline-flex sm:w-auto dark:bg-slate-800" role="tablist" aria-label="Which questions">
            {(['wrong', 'skipped', 'flagged', 'all'] as const).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => {
                  setFilter(f);
                  setOpen(null);
                }}
                className={cx(
                  'tnum rounded-md px-1 py-1.5 text-[0.8125rem] font-semibold whitespace-nowrap capitalize sm:px-3 sm:py-1 sm:text-sm',
                  filter === f ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white' : 'text-slate-500 dark:text-slate-400',
                )}
              >
                {f === 'wrong' ? 'Missed' : f} <span className="font-normal opacity-70">{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing to show here.</p>
        ) : (
          <ul className="-mx-4 divide-y divide-slate-200 border-t border-slate-200 sm:-mx-6 dark:divide-slate-800 dark:border-slate-800">
            {rows.map(({ a, i, q }) => (
              <ResultRow key={i} n={i + 1} answer={a} q={q!} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ResultRow({ n, answer: a, q, open, onToggle }: { n: number; answer: MockAnswer; q: Question; open: boolean; onToggle: () => void }) {
  const right = a.choice === q.correct;
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-50 sm:px-6 dark:hover:bg-slate-800/40 dark:active:bg-slate-800/40"
      >
        <span
          className={cx(
            'tnum mt-0.5 grid h-7 min-w-7 shrink-0 place-items-center rounded-full px-1 text-xs font-bold',
            !a.choice
              ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
              : right
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
          )}
        >
          {n}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cx('block text-sm font-medium text-slate-900 dark:text-slate-100', !open && 'line-clamp-2')}>
            {q.question.split('\n')[0]}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
            {!a.choice ? <span>Skipped</span> : !right && <span className="text-rose-700 dark:text-rose-300">You: {a.choice}</span>}
            <span className="text-emerald-700 dark:text-emerald-300">Answer: {q.correct}</span>
            {a.flagged && (
              <span className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
                <Glyph name="flag" className="h-3 w-3" /> flagged
              </span>
            )}
            <span className="tnum">{formatDuration(a.ms)}</span>
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className={cx('mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-5 sm:px-6">
          <QuestionView question={q} selected={a.choice} revealed />
          <Feedback question={q} selected={a.choice} />
        </div>
      )}
    </li>
  );
}
