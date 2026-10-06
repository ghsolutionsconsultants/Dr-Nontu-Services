import bcrypt from 'bcryptjs';
import { services, locations, practice } from '../content';
import type { Db } from './index';

const DAY = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [1, 2, 3, 4, 5];

export const seoDefaults: Record<string, [string, string]> = {
  '/': ['Dr Nontu Medical Practice | GP in Esther Park & Fourways', 'Warm, personal GP care in Kempton Park and Fourways: in person, at home, or online 24/7. Book an appointment in under a minute.'],
  '/about': ['About Dr Nontu | Dr Nontu Medical Practice', 'Meet Dr Nontuthuko Ndlovu, a GP in primary and emergency care who listens first and explains clearly.'],
  '/services': ['Services | Dr Nontu Medical Practice', 'Consultations, house calls, virtual care, chronic care, women’s health, family care, minor procedures and referrals.'],
  '/house-calls': ['House calls | Dr Nontu Medical Practice', 'A GP who comes to you. House calls daily from 09:00 to 16:00 around Kempton Park and Fourways.'],
  '/care-plans': ['Care plans | Dr Nontu Medical Practice', 'Silver and Gold care plans: simpler, more affordable ongoing healthcare.'],
  '/fees': ['Fees & medical aid | Dr Nontu Medical Practice', 'Consultation fees by type and length, payment options and medical aid information.'],
  '/contact': ['Locations & contact | Dr Nontu Medical Practice', 'Practices in Esther Park (Kempton Park) and Fourways. Call, WhatsApp or book online.'],
  '/faq': ['FAQ | Dr Nontu Medical Practice', 'Appointments, walk-ins, medical aid, house calls, virtual consultations and payments.'],
  '/book': ['Book an appointment | Dr Nontu Medical Practice', 'Choose in person, house call or virtual, pick a length and a time, and pay online or at your visit.'],
};

export async function seed(db: Db) {
  const done = await db.q(`select 1 from settings where key = 'seeded'`);
  if (done.length) { await ensureAdmin(db); return; }

  await db.tx(async (q) => {
    const set = (k: string, v: unknown) => q(`insert into settings (key, value) values ($1, $2) on conflict (key) do nothing`, [k, JSON.stringify(v)]);
    await set('practice', { phone: practice.phones[0], phone2: practice.phones[1], email: practice.email, whatsapp: practice.whatsapp });
    await set('notify_emails', [practice.email]);
    await set('booking', { cancelCutoffHours: 24, leadMinutes: 120, holdMinutes: 15, slotStepMinutes: 15, maxDaysAhead: 60 });
    await set('house_call_areas', []); // empty = accept any address, practice confirms
    await set('fees_are_placeholder', true);

    for (const [i, l] of locations.entries())
      await q(`insert into locations (id, name, kind, address, map_url, parking, sort) values ($1,$2,'clinic',$3,$4,$5,$6)`,
        [l.id, l.name, l.address.join(', '), l.map, l.parking, i]);
    await q(`insert into locations (id, name, kind, sort) values ('home','Your home','home',10), ('online','Video call','virtual',11)`);

    await q(`insert into consult_types (id, name, description, buffer_minutes, requires_prepay, sort) values
      ('in_person','In person','A private, face-to-face consultation at the practice.',5,false,0),
      ('house_call','House call','Professional medical care in the comfort of your home.',30,false,1),
      ('virtual','Virtual','Consult remotely by video from wherever you are.',0,true,2)`);

    // TODO(client): placeholder fees, to be replaced in Admin → Fees before launch
    const dur: [string, number, number][] = [
      ['in_person', 15, 45000], ['in_person', 30, 65000], ['in_person', 45, 85000], ['in_person', 60, 105000],
      ['house_call', 30, 120000], ['house_call', 45, 145000], ['house_call', 60, 170000],
      ['virtual', 15, 35000], ['virtual', 30, 55000], ['virtual', 45, 75000],
    ];
    for (const d of dur) await q(`insert into consult_durations (consult_type, minutes, price_cents) values ($1,$2,$3)`, d);

    for (const [i, s] of services.entries())
      await q(`insert into services (slug, name, summary, body, modes, image, sort) values ($1,$2,$3,$4,$5,$6,$7)`,
        [s.slug, s.name, s.summary, s.body.join('\n\n'), s.modes, s.image, i]);

    for (const loc of ['esther-park', 'fourways'])
      for (const d of WEEKDAYS) await q(`insert into availability_rules (consult_type, location_id, weekday, start_min, end_min) values ('in_person',$1,$2,540,960)`, [loc, d]);
    for (const d of DAY) await q(`insert into availability_rules (consult_type, location_id, weekday, start_min, end_min) values ('house_call','home',$1,540,960)`, [d]);
    for (const d of DAY) await q(`insert into availability_rules (consult_type, location_id, weekday, start_min, end_min) values ('virtual','online',$1,0,1440)`, [d]);

    for (const [p, [t, d]] of Object.entries(seoDefaults))
      await q(`insert into seo_pages (path, title, description) values ($1,$2,$3) on conflict do nothing`, [p, t, d]);

    await set('seeded', new Date().toISOString());
  });
  await ensureAdmin(db);
}

// Creates the first admin from ADMIN_EMAIL / ADMIN_PASSWORD (see .env.local) when none exists.
async function ensureAdmin(db: Db) {
  const email = process.env.ADMIN_EMAIL, pw = process.env.ADMIN_PASSWORD;
  if (!email || !pw) return;
  const any = await db.q(`select 1 from admins limit 1`);
  if (any.length) return;
  await db.q(`insert into admins (email, name, password_hash) values ($1, $2, $3)`, [email.toLowerCase(), 'Dr Nontu', await bcrypt.hash(pw, 11)]);
}
