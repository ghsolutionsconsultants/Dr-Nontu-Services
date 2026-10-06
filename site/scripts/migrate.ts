// npm run db:migrate: apply schema + seed to DATABASE_URL (Supabase) or local PGlite.
import { getDb } from '../lib/db';

process.env.DB_AUTO_MIGRATE = '1';
getDb().then(() => { console.log('Schema and seed applied.'); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
