import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { seed } from './seed';

// One tiny interface over two drivers:
//   DATABASE_URL set → postgres-js (Supabase / any Postgres)
//   otherwise        → PGlite, an embedded Postgres stored in ./.data (local development)
export type Row = Record<string, unknown>;
export type Query = <T = Row>(text: string, params?: unknown[]) => Promise<T[]>;
export interface Db {
  q: Query;
  tx: <T>(fn: (q: Query) => Promise<T>) => Promise<T>;
  exec: (text: string) => Promise<void>;
}

const g = globalThis as unknown as { __dnDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const postgres = (await import('postgres')).default;
    const sql = postgres(url, { max: 5, prepare: false, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : 'require' });
    const run = (s: typeof sql) => (<T>(text: string, params: unknown[] = []) =>
      s.unsafe(text, params as never[]) as unknown as Promise<T[]>) as Query;
    return {
      q: run(sql),
      tx: (fn) => sql.begin((t) => fn(run(t as unknown as typeof sql))) as never,
      exec: async (text) => { await sql.unsafe(text).simple(); },
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const { btree_gist } = await import('@electric-sql/pglite/contrib/btree_gist');
  const dir = process.env.PGLITE_DIR ? path.resolve(process.env.PGLITE_DIR) : path.join(process.cwd(), '.data', 'pglite');
  mkdirSync(dir, { recursive: true });
  const pg = await PGlite.create(dir, { extensions: { btree_gist } });
  const run = (c: { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }) =>
    (async <T>(text: string, params: unknown[] = []) => (await c.query(text, params)).rows as T[]) as Query;
  return { q: run(pg), tx: (fn) => pg.transaction((t) => fn(run(t))), exec: async (text) => { await pg.exec(text); } };
}

export async function migrate(db: Db) {
  await db.exec(readFileSync(path.join(process.cwd(), 'lib', 'db', 'schema.sql'), 'utf8'));
  await seed(db);
}

export function getDb(): Promise<Db> {
  if (!g.__dnDb) {
    g.__dnDb = (async () => {
      const db = await connect();
      if (!process.env.DATABASE_URL || process.env.DB_AUTO_MIGRATE === '1') await migrate(db);
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
export async function tx<T>(fn: (q: Query) => Promise<T>) {
  return (await getDb()).tx(fn);
}
