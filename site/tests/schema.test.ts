import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { schemaSql } from '../lib/db/schema';

describe('schema', () => {
  it('builds an empty database and can be re-run on it', async () => {
    const pg = await PGlite.create({ extensions: { btree_gist } });
    await pg.exec(schemaSql);
    await pg.exec(schemaSql);
    const { rows } = await pg.query<{ n: number }>(`select count(*)::int n from information_schema.tables where table_schema = 'public' and table_name in ('bookings','memberships','messages','seo_pages')`);
    expect(rows[0].n).toBe(4);
    await pg.close();
  }, 30_000);
});
