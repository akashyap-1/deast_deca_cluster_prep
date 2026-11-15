import { useEffect } from 'react';
import { Credit, Logo, LogoMark } from './components/Logo';
import { Button, cx } from './components/ui';
import { PracticePage } from './pages/Practice';
import { MockPage } from './pages/Mock';
import { DashboardPage } from './pages/Dashboard';
import { SettingsPage } from './pages/Settings';
import { ReviewPage } from './pages/Review';
import { LoginPage, NewPasswordPage } from './pages/Login';
import { CLUSTERS, hasBank } from './data/clusters';
import { useAuth } from './lib/auth';
import { navigate, useRoute } from './lib/router';
import { useAppState } from './lib/storage';
import { closeSession, openSession, switchCluster, useSaveStatus, useSession } from './lib/sync';

const NAV = [
  { path: '/practice', label: 'Practice', short: 'Practice', icon: 'M4 6h16M4 12h10M4 18h7' },
  { path: '/review', label: 'Review', short: 'Review', icon: 'M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z' },
  { path: '/mock', label: 'Mock exam', short: 'Mock', icon: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { path: '/dashboard', label: 'Dashboard', short: 'Stats', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  {
    path: '/settings',
    label: 'Settings',
    short: 'Settings',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  },
];

function Icon({ d, className = 'h-5 w-5' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function applyTheme(theme: string) {
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1a3d' : '#12285c');
}

function useTheme() {
  const { theme } = useAppState().settings;
  useEffect(() => {
    try {
      localStorage.setItem('eastdeca:theme', theme);
    } catch {
      /* ignore */
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => applyTheme(theme);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

function Splash({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-slate-100 dark:bg-slate-950">
      <LogoMark className="h-16 w-auto animate-pulse" />
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400" role="status">
        {label}
      </p>
    </div>
  );
}

function ClusterSelect({ value, className }: { value: string; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="sr-only">Cluster</span>
      <select
        value={value}
        onChange={(e) => void switchCluster(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-xl border border-white/15 bg-white/10 bg-[length:16px] bg-[right_0.7rem_center] bg-no-repeat py-2 pr-9 pl-3 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline-gold-400 [&>option]:bg-white [&>option]:text-slate-900"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23f3bf2b' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        }}
      >
        {CLUSTERS.map((c) => (
          <option key={c.id} value={c.id} disabled={!hasBank(c.id)}>
            {c.name}
            {hasBank(c.id) ? '' : ' (coming soon)'}
          </option>
        ))}
      </select>
    </label>
  );
}

function SaveStatus() {
  const s = useSaveStatus();
  const text = s === 'saved' ? 'All progress saved' : s === 'saving' ? 'Saving…' : 'Offline. Progress will save when you reconnect.';
  return (
    <p className="flex items-center gap-2 text-xs text-brand-200" role="status" aria-live="polite">
      <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', s === 'saved' ? 'bg-emerald-400' : s === 'saving' ? 'bg-gold-400' : 'bg-rose-400')} />
      {text}
    </p>
  );
}

function Shell({ cluster }: { cluster: string }) {
  useTheme();
  const route = useRoute();
  let page: React.ReactNode;
  switch (route.path) {
    case '/settings':
      page = <SettingsPage />;
      break;
    case '/dashboard':
      page = <DashboardPage />;
      break;
    case '/review':
      page = <ReviewPage initial={route.params.get('tab')} />;
      break;
    case '/mock':
      page = <MockPage params={route.params} />;
      break;
    default:
      page = <PracticePage key={route.params.toString()} params={route.params} />;
  }
  const active = (p: string) => route.path === p || (p === '/practice' && !NAV.some((n) => n.path === route.path));

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-900 px-4 py-5 text-white lg:flex dark:bg-brand-950 dark:shadow-[1px_0_0_rgb(255_255_255/0.06)]">
        <button onClick={() => navigate('/practice')} aria-label="East DECA Prep home" className="rounded-lg px-1 text-left">
          <Logo />
        </button>
        <ClusterSelect value={cluster} className="mt-6" />
        <nav className="mt-5 flex flex-col gap-0.5" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.path}
              href={`#${n.path}`}
              aria-current={active(n.path) ? 'page' : undefined}
              className={cx(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-medium transition-colors',
                active(n.path) ? 'bg-white/10 text-white' : 'text-brand-100 hover:bg-white/5 hover:text-white',
              )}
            >
              {active(n.path) && <span className="absolute top-2 bottom-2 left-0 w-1 rounded-r bg-gold-400" aria-hidden="true" />}
              <Icon d={n.icon} className={cx('h-5 w-5', active(n.path) ? 'text-gold-400' : 'text-brand-300')} />
              {n.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto space-y-4 border-t border-white/10 pt-4">
          <SaveStatus />
          <Credit className="text-xs leading-relaxed text-brand-200" />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="mobile-chrome sticky top-0 z-20 flex h-[calc(52px+env(safe-area-inset-top))] items-center gap-3 bg-brand-900 px-4 pt-[env(safe-area-inset-top)] text-white lg:hidden dark:bg-brand-950">
        <button onClick={() => navigate('/practice')} aria-label="East DECA Prep home" className="shrink-0">
          <LogoMark className="h-8 w-auto" />
        </button>
        <ClusterSelect value={cluster} className="min-w-0 flex-1" />
      </header>

      <main key={cluster} className="mx-auto max-w-4xl px-4 pt-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:px-10 lg:pt-8 lg:pb-12">
        {page}
        <Credit className="mobile-chrome mt-12 text-center text-xs leading-relaxed text-slate-500 lg:hidden dark:text-slate-400" />
      </main>

      {/* Mobile tab bar */}
      <nav
        className="mobile-chrome fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-brand-900 pb-[env(safe-area-inset-bottom)] lg:hidden dark:bg-brand-950"
        aria-label="Main"
      >
        {NAV.map((n) => (
          <a
            key={n.path}
            href={`#${n.path}`}
            aria-current={active(n.path) ? 'page' : undefined}
            className={cx(
              'relative flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[0.7rem] font-semibold transition-colors active:bg-white/5',
              active(n.path) ? 'text-gold-400' : 'text-brand-200',
            )}
          >
            {active(n.path) && <span className="absolute top-0 h-0.5 w-8 rounded-b bg-gold-400" aria-hidden="true" />}
            <Icon d={n.icon} className="h-[22px] w-[22px]" />
            {n.short}
          </a>
        ))}
      </nav>
    </div>
  );
}

function SignedIn({ userId, email }: { userId: string; email: string }) {
  const session = useSession();
  useEffect(() => {
    void openSession(userId, email);
  }, [userId, email]);
  if (session.status === 'error')
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <LogoMark className="h-14 w-auto" />
        <p className="max-w-sm text-slate-700 dark:text-slate-300">{session.message}</p>
        <Button onClick={() => void openSession(userId, email)}>Try again</Button>
      </div>
    );
  if (session.status !== 'ready') return <Splash label={session.status === 'loading' && session.cluster ? 'Loading questions…' : 'Loading your progress…'} />;
  return <Shell cluster={session.cluster} />;
}

export default function App() {
  const auth = useAuth();
  useEffect(() => {
    if (auth.status === 'signedOut') {
      closeSession();
      let theme = 'dark';
      try {
        theme = localStorage.getItem('eastdeca:theme') ?? 'dark';
      } catch {
        /* ignore */
      }
      applyTheme(theme);
    }
  }, [auth.status]);
  if (auth.status === 'loading') return <Splash label="Signing you in…" />;
  if (auth.status === 'recovery') return <NewPasswordPage />;
  if (auth.status === 'signedOut') return <LoginPage />;
  return <SignedIn userId={auth.session.user.id} email={auth.session.user.email ?? ''} />;
}
