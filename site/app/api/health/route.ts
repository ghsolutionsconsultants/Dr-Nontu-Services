import { getDb } from '@/lib/db';
import { describeDbUrl } from '@/lib/db/url';

export const dynamic = 'force-dynamic';

// GET /api/health: can the site reach its database? Shows the database's own error message
// (never the connection string or password) so hosting problems can be diagnosed quickly.
export async function GET() {
  const started = Date.now();
  try {
    const db = await getDb();
    const [r] = await db.q<{ seeded: boolean; admins: number }>(
      `select exists(select 1 from settings where key = 'seeded') seeded, (select count(*)::int from admins) admins`);
    return Response.json({ ok: true, database: 'connected', seeded: r.seeded, admins: r.admins, ms: Date.now() - started });
  } catch (e) {
    const err = e as { message?: string; code?: string };
    const message = String(err.message ?? e).replace(/postgres(ql)?:\/\/[^\s]+/gi, '[connection string hidden]');
    return Response.json({
      ok: false, database: 'error', code: err.code ?? null, message,
      hasDatabaseUrl: !!process.env.DATABASE_URL, autoMigrate: process.env.DB_AUTO_MIGRATE === '1',
      // the shape of the value only, never any of its characters
      databaseUrlShape: process.env.DATABASE_URL ? describeDbUrl(process.env.DATABASE_URL) : null,
    }, { status: 503 });
  }
}
