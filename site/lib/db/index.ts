import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { seed } from './seed';
import { schemaSql } from './schema';
import { parseDbUrl } from './url';

// One tiny interface over two drivers:
//   DATABASE_URL set → postgres-js (Supabase / any Postgres)
//   otherwise        → PGlite, an embedded Postgres stored in ./.data (local development)
export type Row = Record<string, unknown>;
export type Query = <T = Row>(text: string, params?: unknown[]) => Promise<T[]>;
export type Exec = (text: string) => Promise<void>;
export interface Db {
  q: Query;
  tx: <T>(fn: (q: Query, exec: Exec) => Promise<T>) => Promise<T>;
}

const g = globalThis as unknown as { __dnDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    // node-postgres: one query at a time per connection (no pipelining), which is what
    // Supabase's transaction pooler requires; extra queries wait in the pool's queue.
    const pg = (await import('pg')).default;
    pg.types.setTypeParser(1082, (v: string) => v); // DATE stays 'YYYY-MM-DD' (no timezone shifts)
    const cfg = parseDbUrl(url);
    const local = /^(localhost|127\.0\.0\.1)$/.test(cfg.host);
    const pool = new pg.Pool({
      ...cfg, max: Number(process.env.DB_POOL_MAX ?? 5),
      connectionTimeoutMillis: 10_000, idleTimeoutMillis: 10_000, allowExitOnIdle: true,
      ssl: local ? false : { rejectUnauthorized: false },
    });
    pool.on('error', () => { /* a dropped idle connection is replaced on next use */ });
    type C = { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> };
    const run = (c: C) => (async <T>(text: string, params: unknown[] = []) =>
      (await c.query(text, params.length ? params : undefined)).rows as T[]) as Query;
    return {
      q: run(pool),
      tx: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query('begin');
          // if this server is paused mid-transaction, Postgres aborts it and frees its locks
          await c.query(`set local idle_in_transaction_session_timeout = '15s'; set local lock_timeout = '20s'; set local statement_timeout = '60s'`);
          const r = await fn(run(c), async (text) => { await c.query(text); });
          await c.query('commit');
          return r;
        } catch (e) {
          await c.query('rollback').catch(() => {});
          throw e;
        } finally { c.release(); }
      },
    };
  }
  // the embedded database is for local development only; hosted servers have a read-only filesystem
  if (process.env.VERCEL) throw new Error('DATABASE_URL is not set. Add your Supabase connection string in Vercel → Settings → Environment Variables.');
  const { PGlite } = await import('@electric-sql/pglite');
  const { btree_gist } = await import('@electric-sql/pglite/contrib/btree_gist');
  const dir = process.env.PGLITE_DIR ? path.resolve(process.env.PGLITE_DIR) : path.join(process.cwd(), '.data', 'pglite');
  mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create(dir, { extensions: { btree_gist } });
  const run = (c: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }) =>
    (async <T>(text: string, params: unknown[] = []) => (await c.query(text, params)).rows as T[]) as Query;
  return { q: run(pg), tx: (fn) => pg.transaction((t) => fn(run(t), async (text) => { await t.exec(text); })) };
}

/**
 * Schema + seed in one transaction behind an advisory lock. Builds prerender with several workers at once;
 * the lock makes the first one set up the database while the others wait, then find it done.
 */
export const SCHEMA_VERSION = createHash('sha256').update(schemaSql).digest('hex').slice(0, 12);

export async function migrate(db: Db) {
  await db.tx(async (q, exec) => {
    await q(`select pg_advisory_xact_lock(724501)`);
    await exec(schemaSql);
    await seed(q);
    await q(`insert into settings (key, value) values ('schema_version', $1::text::jsonb) on conflict (key) do update set value = excluded.value`, [JSON.stringify(SCHEMA_VERSION)]);
  });
}

/** True when the database already has this exact schema (so a cold start can skip all DDL and its locks). */
async function upToDate(db: Db) {
  // ask whether the table exists first: a failing query would cost the pool its connection
  const [t] = await db.q<{ exists: boolean }>(`select to_regclass('public.settings') is not null as exists`);
  if (!t?.exists) return false;
  const [r] = await db.q<{ value: string }>(`select value from settings where key = 'schema_version'`);
  return r?.value === SCHEMA_VERSION;
}

export function getDb(): Promise<Db> {
  if (!g.__dnDb) {
    g.__dnDb = (async () => {
      const db = await connect();
      // schema changes apply themselves: a cheap version check, then a locked migration only when needed
      if (!(await upToDate(db))) await migrate(db);
      return db;
    })().catch((e) => { g.__dnDb = undefined; throw e; });
  }
  return g.__dnDb;
}

export async function q<T = Row>(text: string, params?: unknown[]) {
  return (await getDb()).q<T>(text, params);
}
export async function one<T = Row>(text: string, params?: unknown[]) {
  return (await q<T>(text, params))[0] as T | undefined;
}
export async function tx<T>(fn: (q: Query, exec: Exec) => Promise<T>) {
  return (await getDb()).tx(fn);
}
