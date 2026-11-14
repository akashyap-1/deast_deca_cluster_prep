import { useState, type FormEvent, type ReactNode } from 'react';
import { Credit, LogoMark } from '../components/Logo';
import { Button, LINK, cx } from '../components/ui';
import { resendConfirmation, sendReset, signIn, signUp, updatePassword } from '../lib/auth';
import { isAllowedEmail } from '../lib/supabase';

type Mode = 'signIn' | 'signUp' | 'forgot' | 'checkEmail' | 'resetSent';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-100 lg:flex-row dark:bg-slate-950">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-brand-900 px-6 py-8 text-white lg:w-[42%] lg:px-14 lg:py-12 dark:bg-brand-950">
        <div className="flex items-center gap-3 lg:block">
          <LogoMark className="h-14 w-auto lg:h-auto lg:w-56" />
          <div className="lg:mt-10">
            <h1 className="text-2xl font-bold tracking-tight lg:text-4xl">East DECA Prep</h1>
            <p className="mt-1 max-w-sm text-sm text-brand-100 lg:mt-3 lg:text-base">
              Cluster exam practice built from real past DECA exams, for Downingtown East DECA members.
            </p>
          </div>
        </div>
        <Credit className="mt-8 hidden text-sm leading-relaxed text-brand-200 lg:block" />
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">{children}</div>
        <Credit className="mt-10 text-center text-xs leading-relaxed text-slate-500 lg:hidden dark:text-slate-400" />
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</span>
      <input
        {...props}
        className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[0.95rem] text-slate-900 placeholder:text-slate-500 focus:border-brand-600 focus:outline-none focus-visible:outline-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-gold-400"
      />
      {hint && <span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
      {children}
    </p>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={LINK}
    >
      {children}
    </button>
  );
}

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const emailBad = email.includes('@') && email.trim().split('@')[1]?.includes('.') && !isAllowedEmail(email);

  function go(m: Mode) {
    setMode(m);
    setError(null);
    setNote(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signIn') {
        const err = await signIn(email, password);
        if (err) setError(err);
      } else if (mode === 'signUp') {
        const err = await signUp(email, password);
        if (err) setError(err);
        else go('checkEmail');
      } else if (mode === 'forgot') {
        const err = await sendReset(email);
        if (err) setError(err);
        else go('resetSent');
      }
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'checkEmail' || mode === 'resetSent') {
    return (
      <Shell>
        <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          We sent a link to <span className="font-semibold text-slate-900 dark:text-white">{email.trim()}</span>.{' '}
          {mode === 'checkEmail'
            ? 'Open it to confirm your account, then come back here and sign in.'
            : 'Open it to choose a new password.'}
        </p>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Nothing after a few minutes? Check spam or quarantine. School email filters sometimes hold messages from new senders.
        </p>
        {note && <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300" role="status">{note}</p>}
        {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
          <Button onClick={() => go('signIn')}>Back to sign in</Button>
          {mode === 'checkEmail' && (
            <LinkButton
              onClick={async () => {
                const err = await resendConfirmation(email);
                if (err) setError(err);
                else setNote('Sent another confirmation email.');
              }}
            >
              Resend email
            </LinkButton>
          )}
        </div>
      </Shell>
    );
  }

  const title = mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create your account' : 'Reset your password';
  const action = mode === 'signIn' ? 'Sign in' : mode === 'signUp' ? 'Create account' : 'Send reset link';

  return (
    <Shell>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        {mode === 'forgot'
          ? 'Enter your school email and we’ll send you a link to choose a new password.'
          : 'Only Downingtown Area School District accounts can use East DECA Prep.'}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <Field
          label="School email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@student.dasd.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={emailBad || undefined}
          hint={emailBad ? <span className="text-rose-700 dark:text-rose-300">Use your @student.dasd.org or @dasd.org address.</span> : undefined}
          required
        />
        {mode !== 'forgot' && (
          <div>
            <Field
              label="Password"
              type={show ? 'text' : 'password'}
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint={mode === 'signUp' ? 'At least 8 characters. Don’t reuse your school password.' : undefined}
              required
            />
            <div className="mt-2 flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 accent-brand-600 dark:accent-gold-400" />
                Show password
              </label>
              {mode === 'signIn' && <LinkButton onClick={() => go('forgot')}>Forgot password?</LinkButton>}
            </div>
          </div>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" className="w-full !py-3 !text-[0.95rem]" disabled={busy || !email || (mode !== 'forgot' && !password)}>
          {busy ? 'One moment…' : action}
        </Button>
      </form>
      <p className={cx('mt-6 text-sm text-slate-600 dark:text-slate-300')}>
        {mode === 'signIn' ? (
          <>
            New here? <LinkButton onClick={() => go('signUp')}>Create an account</LinkButton>
          </>
        ) : (
          <>
            {mode === 'signUp' ? 'Already have an account? ' : 'Remembered it? '}
            <LinkButton onClick={() => go('signIn')}>Sign in</LinkButton>
          </>
        )}
      </p>
    </Shell>
  );
}

/** Shown after following a password-reset link. */
export function NewPasswordPage() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Shell>
      <h2 className="text-2xl font-bold tracking-tight">Choose a new password</h2>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(await updatePassword(password));
          setBusy(false);
        }}
      >
        <Field label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 8 characters." />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" className="w-full !py-3" disabled={busy || password.length < 8}>
          {busy ? 'Saving…' : 'Save password'}
        </Button>
      </form>
    </Shell>
  );
}
