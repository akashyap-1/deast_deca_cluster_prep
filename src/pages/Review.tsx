// The Review page: questions you saved for later (bookmarks) and every question you've answered
// wrong in practice or mock exams (from your attempts). Both are stored on your account.
import { useMemo, useState } from 'react';
import { byId, examLabel } from '../data/bank';
import { clusterById } from '../data/clusters';
import { Feedback } from '../components/QuestionView';
import { Button, Card, Glyph, cx } from '../components/ui';
import { navigate } from '../lib/router';
import { SRS_INTERVALS_DAYS, questionStats } from '../lib/stats';
import { store, useAppState } from '../lib/storage';
import { useSession } from '../lib/sync';
import type { Letter, Question } from '../lib/types';
import { BookmarkButton } from './Practice';

type View = 'saved' | 'learning' | 'all';

interface Item {
  q: Question;
  timesMissed: number;
  /** Your most recent wrong answer, or null if you've never gotten it wrong. */
  lastWrong: Letter | null;
  lastWrongTs: number;
  rightSince: number;
  learned: boolean;
}

function studySheet(items: Item[], clusterName: string, title: string): string {
  const lines = [`East DECA Prep · ${clusterName} · ${title}`, `Saved ${new Date().toLocaleDateString()}`, ''];
  items.forEach((it, i) => {
    const q = it.q;
    lines.push(`${i + 1}. ${q.question}`);
    for (const L of ['A', 'B', 'C', 'D'] as const) lines.push(`   ${L}. ${q.options[L]}`);
    lines.push(`   ${it.lastWrong ? `Your answer: ${it.lastWrong}   ` : ''}Correct: ${q.correct}. ${q.options[q.correct]}`);
    lines.push(`   Why: ${q.explanation}`);
    lines.push(`   ${q.piCode}${q.piDescription ? ` ${q.piDescription}` : ''} · ${q.instructionalArea} · ${examLabel(q.exam)} #${q.number}`);
    lines.push('');
  });
  lines.push('by Advik Kashyap · Made for Downingtown East DECA');
  return lines.join('\n');
}

const EMPTY: Record<View, string> = {
  saved: 'No saved questions yet. Tap the bookmark on any question (or press S) to save it here.',
  learning: 'You’ve learned every question you missed here. Nice work.',
  all: 'No missed questions here yet.',
};

export function ReviewPage({ initial }: { initial?: string | null }) {
  const state = useAppState();
  const session = useSession();
  const cluster = clusterById(session.status === 'ready' ? session.cluster : 'finance');
  const [view, setView] = useState<View>(initial === 'missed' ? 'learning' : 'saved');
  const [area, setArea] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const missed = useMemo<Item[]>(() => {
    const stats = questionStats(state.attempts);
    const wrong = new Map<string, { choice: Letter; ts: number; count: number }>();
    for (const a of state.attempts) {
      if (a.correct) continue;
      const prev = wrong.get(a.qid);
      wrong.set(a.qid, {
        choice: !prev || a.ts >= prev.ts ? a.choice : prev.choice,
        ts: Math.max(a.ts, prev?.ts ?? 0),
        count: (prev?.count ?? 0) + 1,
      });
    }
    const out: Item[] = [];
    for (const [qid, w] of wrong) {
      const q = byId.get(qid);
      const s = stats.get(qid);
      if (!q || !s) continue;
      out.push({
        q,
        timesMissed: w.count,
        lastWrong: w.choice,
        lastWrongTs: w.ts,
        rightSince: s.correctSinceMiss,
        learned: s.correctSinceMiss >= SRS_INTERVALS_DAYS.length,
      });
    }
    return out.sort((a, b) => b.lastWrongTs - a.lastWrongTs);
  }, [state.attempts]);

  const saved = useMemo<Item[]>(() => {
    const byMissed = new Map(missed.map((i) => [i.q.id, i]));
    const out: Item[] = [];
    for (const id of [...state.bookmarks].reverse()) {
      const q = byId.get(id);
      if (q) out.push(byMissed.get(id) ?? { q, timesMissed: 0, lastWrong: null, lastWrongTs: 0, rightSince: 0, learned: false });
    }
    return out;
  }, [state.bookmarks, missed]);

  const learning = missed.filter((i) => !i.learned);
  const pool = view === 'saved' ? saved : view === 'learning' ? learning : missed;
  const areasHere = [...new Set(pool.map((i) => i.q.instructionalArea))].sort();
  const shown = area ? pool.filter((i) => i.q.instructionalArea === area) : pool;

  function download() {
    const title = view === 'saved' ? 'saved questions' : 'missed questions';
    const blob = new Blob([studySheet(shown, cluster.name, title)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${view === 'saved' ? 'saved' : 'missed'}-${cluster.id}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function practice() {
    const filter = view === 'saved' ? 'bookmarked=1' : 'missed=1';
    navigate(`/practice?${filter}${area ? `&area=${encodeURIComponent(area)}` : ''}`);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Review</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Questions you saved, and every {cluster.name} question you’ve answered wrong, kept on your account. A missed question
          counts as learned after you get it right {SRS_INTERVALS_DAYS.length} times in a row.
        </p>
      </div>

      {missed.length === 0 && saved.length === 0 ? (
        <Card>
          <p className="text-slate-600 dark:text-slate-300">
            Nothing here yet. Tap the bookmark on any question (or press <kbd>S</kbd>) to save it for later. Questions you miss in
            practice or mock exams show up here automatically.
          </p>
          <Button className="mt-4" onClick={() => navigate('/practice')}>
            Start practicing <Glyph name="next" />
          </Button>
        </Card>
      ) : (
        <>
          <Card className="!p-3 sm:!px-5 sm:!py-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Which questions">
                {(
                  [
                    ['saved', 'Saved', saved.length],
                    ['learning', 'Still learning', learning.length],
                    ['all', 'All missed', missed.length],
                  ] as const
                ).map(([v, label, n]) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => {
                      setView(v);
                      setArea('');
                      setOpen(null);
                    }}
                    className={cx(
                      'tnum rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                      view === v
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200',
                    )}
                  >
                    {label} <span className="font-normal text-slate-500 dark:text-slate-400">{n}</span>
                  </button>
                ))}
              </div>
              <label className="min-w-0 flex-1 sm:flex-none">
                <span className="sr-only">Instructional area</span>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">All areas</option>
                  {areasHere.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
                <Button variant="secondary" onClick={download} disabled={!shown.length} className="flex-1 sm:flex-none">
                  Download
                </Button>
                <Button onClick={practice} disabled={!shown.length} className="flex-1 sm:flex-none">
                  Practice these <Glyph name="next" />
                </Button>
              </div>
            </div>
          </Card>

          {shown.length === 0 ? (
            <Card>
              <p className="text-slate-600 dark:text-slate-300">{EMPTY[view]}</p>
            </Card>
          ) : (
            <ul className="space-y-2.5">
              {shown.map((it) => {
                const q = it.q;
                const isOpen = open === q.id;
                return (
                  <li key={q.id}>
                    <Card className="relative !p-0">
                      <div className="absolute top-2.5 right-2.5">
                        <BookmarkButton on={state.bookmarks.includes(q.id)} onClick={() => store.toggleBookmark(q.id)} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : q.id)}
                        aria-expanded={isOpen}
                        className="w-full rounded-2xl p-4 pr-12 text-left sm:px-5 sm:pr-12"
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-brand-700 dark:text-brand-300">{q.instructionalArea}</span>
                          <span>·</span>
                          <span>
                            {examLabel(q.exam)} #{q.number}
                          </span>
                          {it.timesMissed > 0 && <span className="tnum">· missed {it.timesMissed}×</span>}
                          {it.timesMissed === 0 ? null : it.learned ? (
                            <span className="rounded bg-emerald-100 px-1.5 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              learned
                            </span>
                          ) : it.rightSince > 0 ? (
                            <span className="tnum rounded bg-amber-100 px-1.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              right {it.rightSince}× since
                            </span>
                          ) : null}
                        </div>
                        <p className={cx('mt-2 font-medium text-slate-900 dark:text-slate-100', !isOpen && 'line-clamp-2')}>{q.question}</p>
                        {!isOpen && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                            {it.lastWrong && (
                              <>
                                <span className="text-rose-700 dark:text-rose-300">You: {it.lastWrong}</span>
                                <span className="mx-2 text-slate-400">·</span>
                              </>
                            )}
                            <span className="text-emerald-700 dark:text-emerald-300">
                              Answer: {q.correct}. {q.options[q.correct]}
                            </span>
                          </p>
                        )}
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 sm:px-5">
                          <ul className="space-y-1.5 text-sm">
                            {(['A', 'B', 'C', 'D'] as const).map((L) => (
                              <li
                                key={L}
                                className={cx(
                                  'rounded-lg border px-3 py-2',
                                  L === q.correct
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                                    : L === it.lastWrong
                                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40'
                                      : 'border-slate-200 dark:border-slate-700',
                                )}
                              >
                                <span className="font-semibold">{L}.</span> {q.options[L]}
                              </li>
                            ))}
                          </ul>
                          {it.lastWrong ? (
                            <Feedback question={q} selected={it.lastWrong} />
                          ) : (
                            <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                              <p className="leading-relaxed text-slate-700 dark:text-slate-300">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
