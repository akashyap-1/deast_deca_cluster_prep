// Supabase client. The URL and publishable key are public by design; data is protected by
// Row Level Security (see supabase/schema.sql).
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://uzkzrnuruzizwtsqsvnp.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_yAUSm7OCHDEmX5DSviiBdg_L76XPE06';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const ALLOWED = /^[^@\s]+@(student\.)?dasd\.org$/i;

/** District student and staff addresses. The database also accepts a private allowlist (supabase/allowlist.sql). */
export function isAllowedEmail(email: string): boolean {
  return ALLOWED.test(email.trim());
}
