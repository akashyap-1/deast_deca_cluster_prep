// A tiny in-memory stand-in for the Supabase REST + auth API, for browser tests.
// It understands just what src/lib/sync.ts sends: eq filters, upsert with on_conflict, delete.
import type { BrowserContext, Route } from 'playwright';

export const FAKE_USER = { id: '00000000-0000-4000-8000-000000000001', email: 'test.student@student.dasd.org' };
const STORAGE_KEY = 'sb-uzkzrnuruzizwtsqsvnp-auth-token';

function session() {
  const user = { ...FAKE_USER, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} };
  const payload = Buffer.from(JSON.stringify({ sub: user.id, email: user.email, exp: 4102444800, role: 'authenticated' })).toString('base64url');
  return { access_token: `x.${payload}.y`, refresh_token: 'r', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, user };
}

type Row = Record<string, unknown>;

export class FakeSupabase {
  tables = new Map<string, Row[]>();

  rows(table: string): Row[] {
    if (!this.tables.has(table)) this.tables.set(table, []);
    return this.tables.get(table)!;
  }

  /** Signs the context in as FAKE_USER and serves every Supabase call from memory. */
  async attach(ctx: BrowserContext, { signedIn = true } = {}) {
    if (signedIn)
      await ctx.addInitScript(([k, s]) => localStorage.setItem(k as string, JSON.stringify(s)), [STORAGE_KEY, session()] as const);
    await ctx.route('**/auth/v1/**', (r) => r.fulfill({ json: session().user }));
    await ctx.route('**/rest/v1/**', (r) => this.handle(r));
  }

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    const table = url.pathname.split('/').pop()!;
    const filters: [string, string][] = [];
    for (const [k, v] of url.searchParams) if (v.startsWith('eq.')) filters.push([k, v.slice(3)]);
    const match = (row: Row) => filters.every(([k, v]) => String(row[k]) === v);
    const rows = this.rows(table);

    if (req.method() === 'GET') return route.fulfill({ json: rows.filter(match) });
    if (req.method() === 'DELETE') {
      this.tables.set(table, rows.filter((row) => !match(row)));
      return route.fulfill({ status: 204, body: '' });
    }
    // POST = insert / upsert
    const body = req.postDataJSON() as Row | Row[];
    const conflict = (url.searchParams.get('on_conflict') ?? 'id').split(',');
    const ignore = (req.headers()['prefer'] ?? '').includes('ignore-duplicates');
    for (const incoming of Array.isArray(body) ? body : [body]) {
      const row: Row = { user_id: FAKE_USER.id, ...incoming };
      const i = rows.findIndex((r) => conflict.every((c) => r[c] === row[c]));
      if (i < 0) rows.push(row);
      else if (!ignore) rows[i] = { ...rows[i], ...row };
    }
    return route.fulfill({ status: 201, body: '' });
  }
}
