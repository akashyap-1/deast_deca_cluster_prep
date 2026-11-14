import { useRef, useState } from 'react';
import { allQuestions, bank } from '../data/bank';
import { clusterById } from '../data/clusters';
import { Button, Card, Toggle, cx } from '../components/ui';
import { signOut } from '../lib/auth';
import { store, useAppState, type Theme } from '../lib/storage';
import { hasPendingChanges, useSession } from '../lib/sync';

function plural(n: number, word: string) {
  return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
}

export function SettingsPage() {
  const state = useAppState();
  const session = useSession();
  const email = session.status === 'ready' ? session.email : '';
  const cluster = clusterById(session.status === 'ready' ? session.cluster : 'finance');
  const [goal, setGoal] = useState(String(state.settings.dailyGoal));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const flagged = allQuestions.filter((q) => q.needsReview).length;

  function saveGoal(v: string) {
    setGoal(v);
    const n = Number(v);
    if (Number.isFinite(n) && n >= 1 && n <= 500) store.setSettings({ dailyGoal: Math.round(n) });
  }

  function exportProgress() {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `east-deca-prep-${cluster.id}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMsg({ ok: true, text: 'Progress exported.' });
  }

  async function importProgress(file: File) {
    try {
      const text = await file.text();
      if (!window.confirm('Importing replaces all current progress with the file’s contents. Continue?')) return;
      store.importJSON(text);
      const s = store.get();
      setGoal(String(s.settings.dailyGoal));
      setMsg({ ok: true, text: `Imported ${plural(s.attempts.length, 'answer')}, ${plural(s.mocks.length, 'mock exam')}, ${plural(s.bookmarks.length, 'bookmark')}.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>

      <Card>
        <h2 className="font-bold">Account</h2>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Signed in as <span className="font-semibold text-slate-900 dark:text-white">{email}</span>. Your progress is saved to
            your account, so you can sign in on any device.
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              if (hasPendingChanges() && !window.confirm('Some answers haven’t finished saving. Sign out anyway? They may be lost.')) return;
              void signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">Study</h2>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Daily goal
            <span className="block text-xs text-slate-500">Questions per day. Streaks count days you hit it.</span>
          </span>
          <input
            type="number"
            min={1}
            max={500}
            value={goal}
            onChange={(e) => saveGoal(e.target.value)}
            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-right tabular-nums dark:border-slate-600 dark:bg-slate-800"
          />
        </label>
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Toggle
            label={
              <span>
                Include questions flagged for review
                <span className="block text-xs text-slate-500">
                  {flagged
                    ? `${flagged} question(s) the parser could not read cleanly. See docs/parse-report.md.`
                    : 'The parser flagged no questions, so this changes nothing right now.'}
                </span>
              </span>
            }
            checked={state.settings.includeFlagged}
            onChange={(v) => store.setSettings({ includeFlagged: v })}
          />
        </div>
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Toggle
            label={
              <span>
                Show timer
                <span className="block text-xs text-slate-500">
                  Time on each question in practice, time left in mock exams. The last 5 minutes of a mock always show.
                </span>
              </span>
            }
            checked={state.settings.showTimer}
            onChange={(v) => store.setSettings({ showTimer: v })}
          />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-bold">Appearance</h2>
        <div className="inline-flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800" role="radiogroup" aria-label="Theme">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button
              key={t}
              role="radio"
              aria-checked={state.settings.theme === t}
              onClick={() => store.setSettings({ theme: t })}
              className={cx(
                'rounded-md px-4 py-1.5 text-sm font-semibold capitalize',
                state.settings.theme === t ? 'bg-white shadow-sm dark:bg-slate-950' : 'text-slate-500',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">Your {cluster.name} progress</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {plural(state.attempts.length, 'answer')}, {plural(state.mocks.length, 'mock exam')} and {plural(state.bookmarks.length, 'bookmark')}, saved to your
          account. Export a copy as a file, or import one to replace this cluster’s progress.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={exportProgress}>Export progress</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            Import progress…
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importProgress(e.target.files[0])}
          />
        </div>
        {msg && (
          <p className={cx('mt-3 text-sm', msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400')} role="status">
            {msg.text}
          </p>
        )}
      </Card>

      <Card className="border-rose-200 dark:border-rose-900">
        <h2 className="font-bold text-rose-700 dark:text-rose-400">Reset progress</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Deletes every {cluster.name} answer, bookmark and mock exam from your account on every device. Other clusters
          and your settings are kept. This cannot be undone, so export first if you might want it back.
        </p>
        <label className="mt-3 block text-sm">
          Type <span className="font-mono font-bold">RESET</span> to confirm
          <input
            value={confirmReset}
            onChange={(e) => setConfirmReset(e.target.value)}
            className="mt-1 block w-40 rounded-lg border border-slate-300 bg-white px-3 py-1.5 dark:border-slate-600 dark:bg-slate-800"
            autoComplete="off"
          />
        </label>
        <Button
          variant="danger"
          className="mt-3"
          disabled={confirmReset !== 'RESET'}
          onClick={() => {
            store.reset(true);
            setConfirmReset('');
            setMsg({ ok: true, text: 'Progress reset.' });
          }}
        >
          Reset {cluster.short} progress
        </Button>
      </Card>

      <p className="text-center text-xs text-slate-400">
        {cluster.name} · {bank.questions.length.toLocaleString()} questions from {bank.exams.filter((e) => !e.duplicateOf).length} past exams · bank
        built {new Date(bank.generatedAt).toLocaleDateString()}
      </p>
    </div>
  );
}
