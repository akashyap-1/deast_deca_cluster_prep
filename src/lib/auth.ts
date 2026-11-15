// Session state and the auth actions used by the login screen and Settings.
import { useSyncExternalStore } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isAllowedEmail, supabase } from './supabase';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut'; recovery?: false }
  | { status: 'recovery'; session: Session }
  | { status: 'signedIn'; session: Session };

let state: AuthState = { status: 'loading' };
const listeners = new Set<() => void>();
function set(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

/** Non-district user the database has confirmed is on its private allowlist (supabase/allowlist.sql). */
let verifiedId: string | null = null;

function fromSession(session: Session | null): AuthState {
  if (!session) return { status: 'signedOut' };
  if (isAllowedEmail(session.user.email ?? '') || session.user.id === verifiedId) return { status: 'signedIn', session };
  // Any other address can only exist if it's on the database allowlist, which the site can't read.
  // Ask the database; sign out if it says no.
  const id = session.user.id;
  void supabase.rpc('is_dasd_user').then(({ data, error }) => {
    if (!error && data === true) {
      verifiedId = id;
      set({ status: 'signedIn', session });
    } else {
      void supabase.auth.signOut();
      set({ status: 'signedOut' });
    }
  });
  return { status: 'loading' };
}

supabase.auth.getSession().then(({ data }) => {
  if (state.status === 'loading') set(fromSession(data.session));
});
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) set({ status: 'recovery', session });
  else if (state.status === 'recovery' && event !== 'SIGNED_OUT' && event !== 'USER_UPDATED') return;
  else set(fromSession(session));
});

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** Page URL Supabase sends people back to from confirmation and reset emails. */
function redirectTo(): string {
  return window.location.origin + window.location.pathname;
}

export const DOMAIN_ERROR = 'Use your Downingtown school email (@student.dasd.org or @dasd.org).';

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password don’t match. Check both, or reset your password.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email first. Check your school inbox (and spam) for the link we sent.';
  if (/already registered|already been registered/i.test(message)) return 'An account with this email already exists. Sign in instead.';
  if (/dasd\.org|database error saving new user/i.test(message)) return DOMAIN_ERROR;
  if (/password should be at least/i.test(message)) return 'Use a password with at least 8 characters.';
  if (/rate limit|too many/i.test(message)) return 'Too many tries. Wait a minute and try again.';
  if (/fetch|network/i.test(message)) return 'Can’t reach the server. Check your connection and try again.';
  return message;
}

// Sign-in, sign-up and reset don't block non-district addresses here: the database decides, so an
// address on its private allowlist works. Everyone else is rejected by the sign-up trigger.
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? friendly(error.message) : null;
}

/** Returns an error message, or null when the confirmation email was sent. */
export async function signUp(email: string, password: string): Promise<string | null> {
  if (password.length < 8) return 'Use a password with at least 8 characters.';
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: redirectTo() },
  });
  if (error) return friendly(error.message);
  // Supabase returns a user with no identities when the email is already registered.
  if (data.user && data.user.identities?.length === 0) return 'An account with this email already exists. Sign in instead.';
  return null;
}

export async function sendReset(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() });
  return error ? friendly(error.message) : null;
}

export async function resendConfirmation(email: string): Promise<string | null> {
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo() } });
  return error ? friendly(error.message) : null;
}

export async function updatePassword(password: string): Promise<string | null> {
  if (password.length < 8) return 'Use a password with at least 8 characters.';
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) return friendly(error.message);
  if (data.user) {
    const { data: s } = await supabase.auth.getSession();
    set(fromSession(s.session));
  }
  return null;
}

export async function signOut() {
  verifiedId = null;
  await supabase.auth.signOut();
}
