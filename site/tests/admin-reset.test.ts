import { afterEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { schemaSql } from '../lib/db/schema';
import { resetAdminFromEnv } from '../lib/db/seed';
import type { Query } from '../lib/db';

async function db() {
  const pg = await PGlite.create({ extensions: { btree_gist } });
  await pg.exec(schemaSql);
  const q = (async (text: string, params: unknown[] = []) => (await pg.query(text, params)).rows) as Query;
  return { pg, q };
}
const admins = (q: Query) => q<{ email: string; password_hash: string }>(`select email, password_hash from admins order by id`);

describe('ADMIN_RESET', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('replaces a forgotten login with the one in the environment, once', async () => {
    const { pg, q } = await db();
    await q(`insert into admins (email, name, password_hash) values ('old@example.com', 'Dr Nontu', 'x'), ('other@example.com', 'Someone', 'y')`);
    vi.stubEnv('ADMIN_EMAIL', 'New@DrNontu.co.za');
    vi.stubEnv('ADMIN_PASSWORD', 'a-new-long-password');
    await resetAdminFromEnv(q);
    let rows = await admins(q);
    expect(rows.map((r) => r.email)).toEqual(['new@drnontu.co.za']);
    expect(await bcrypt.compare('a-new-long-password', rows[0].password_hash)).toBe(true);
    // a second start with the same values leaves the row alone
    const before = rows[0].password_hash;
    await resetAdminFromEnv(q);
    rows = await admins(q);
    expect(rows[0].password_hash).toBe(before);
    await pg.close();
  }, 30_000);

  it('changes nothing when the password is too short', async () => {
    const { pg, q } = await db();
    await q(`insert into admins (email, name, password_hash) values ('old@example.com', 'Dr Nontu', 'x')`);
    vi.stubEnv('ADMIN_EMAIL', 'new@drnontu.co.za');
    vi.stubEnv('ADMIN_PASSWORD', 'short');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await resetAdminFromEnv(q);
    expect((await admins(q)).map((r) => r.email)).toEqual(['old@example.com']);
    warn.mockRestore();
    await pg.close();
  }, 30_000);
});
