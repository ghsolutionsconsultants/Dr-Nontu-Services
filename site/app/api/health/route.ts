import { getDb, SCHEMA_VERSION } from '@/lib/db';
import { describeDbUrl } from '@/lib/db/url';
import { getCatalog, getMonthAvailability } from '@/lib/booking';
import { dateKey } from '@/lib/time';

export const dynamic = 'force-dynamic';

const timed = async <T,>(fn: () => Promise<T>, ms = 15000) => {
  const t0 = Date.now();
  try {
    const v = await Promise.race([fn(), new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timed out after ${ms / 1000}s`)), ms))]);
    return { ok: true as const, ms: Date.now() - t0, v };
  } catch (e) { return { ok: false as const, ms: Date.now() - t0, error: redact(e) }; }
};
const redact = (e: unknown) => String((e as Error)?.message ?? e).replace(/postgres(ql)?:\/\/[^\s]+/gi, '[connection string hidden]');

// GET /api/health: can the site reach its database? ?deep=1 also times the booking queries.
// Shows the database's own error message (never the connection string or password).
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.has('deep');
  const conn = await timed(async () => {
    const db = await getDb();
    const [r] = await db.q<{ seeded: boolean; admins: number }>(
      `select exists(select 1 from settings where key = 'seeded') seeded, (select count(*)::int from admins) admins`);
    return r;
  });
  if (!conn.ok) {
    return Response.json({
      ok: false, database: 'error', message: conn.error, ms: conn.ms,
      hasDatabaseUrl: !!process.env.DATABASE_URL, autoMigrate: process.env.DB_AUTO_MIGRATE === '1',
      // the shape of the value only, never any of its characters
      databaseUrlShape: process.env.DATABASE_URL ? describeDbUrl(process.env.DATABASE_URL) : null,
    }, { status: 503 });
  }
  const body: Record<string, unknown> = { ok: true, database: 'connected', ...conn.v, ms: conn.ms, schema: SCHEMA_VERSION, autoMigrate: process.env.DB_AUTO_MIGRATE === '1' };
  if (deep) {
    const cat = await timed(getCatalog);
    const avail = await timed(() => getMonthAvailability({ type: 'in_person', location: 'esther-park', duration: 30, month: dateKey(new Date()).slice(0, 7) }));
    body.catalog = cat.ok ? { ms: cat.ms, types: cat.v.types.length, services: cat.v.services.length } : cat;
    body.availability = avail.ok ? { ms: avail.ms, openDays: avail.v.length } : avail;
    body.ok = cat.ok && avail.ok;
  }
  return Response.json(body, { status: body.ok ? 200 : 503 });
}
