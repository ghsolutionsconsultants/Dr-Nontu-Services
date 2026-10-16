import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AdminBookingInput } from '../lib/admin-bookings';

// a throwaway embedded database, migrated and seeded like the real one
process.env.PGLITE_DIR = mkdtempSync(path.join(tmpdir(), 'dn-admin-bookings-'));
const ab = await import('../lib/admin-bookings');
const { q, one } = await import('../lib/db');
const { recordInPersonPayment } = await import('../lib/payments');

const base: AdminBookingInput = {
  type: 'in_person', location: 'esther-park', serviceId: null, duration: 30, price: 650, date: '2027-03-02', time: '10:00',
  status: 'confirmed', paymentChoice: 'at_visit', name: 'Test Patient', email: '', phone: '', dob: '',
  medicalAid: null, medicalAidNo: null, address: null, reason: '', allowOverlap: false, repeat: 'none', repeatCount: 1,
};

describe('practice bookings', () => {
  beforeAll(async () => { await q('select 1'); }, 60_000);

  it('refuses an overlap unless double-booking is allowed', async () => {
    const [first] = await ab.createAdminBookings(base);
    expect(first.ref).toMatch(/^DN-/);
    await expect(ab.createAdminBookings({ ...base, time: '10:15' })).rejects.toThrow(/overlaps Test Patient/);
    const [squeezed] = await ab.createAdminBookings({ ...base, time: '10:15', allowOverlap: true });
    expect(squeezed.allow_overlap).toBe(true);
  });

  it('takes any length, fee and past date, and needs only a name', async () => {
    const [b] = await ab.createAdminBookings({ ...base, date: '2020-01-06', time: '07:05', duration: 50, price: 0, status: 'completed' });
    expect([b.duration_minutes, b.price_cents, b.status, b.patient_email]).toEqual([50, 0, 'completed', '']);
  });

  it('books a weekly series all or nothing', async () => {
    await ab.createAdminBookings({ ...base, name: 'Blocker', date: '2027-03-18', time: '14:00' });
    await expect(ab.createAdminBookings({ ...base, name: 'Series', date: '2027-03-04', time: '14:00', repeat: '1w', repeatCount: 3 })).rejects.toThrow(/18 Mar/);
    expect((await q(`select 1 from bookings where patient_name = 'Series'`)).length).toBe(0);
    const made = await ab.createAdminBookings({ ...base, name: 'Series', date: '2027-03-05', time: '14:00', repeat: '2w', repeatCount: 3 });
    expect(made.map((b) => new Date(b.start_at).toISOString().slice(0, 10))).toEqual(['2027-03-05', '2027-03-19', '2027-04-02']);
  });

  it('edits every field, and a cancelled booking no longer blocks its time', async () => {
    const [b] = await ab.createAdminBookings({ ...base, date: '2027-04-06' });
    const u = await ab.updateAdminBooking(b.id, { ...base, date: '2027-04-06', type: 'virtual', duration: 45, price: 500, name: 'Renamed', status: 'cancelled' });
    expect([u.consult_type, u.location_id, u.duration_minutes, u.price_cents, u.patient_name, u.status]).toEqual(['virtual', 'online', 45, 50000, 'Renamed', 'cancelled']);
    expect(u.cancelled_at).not.toBeNull();
    await ab.createAdminBookings({ ...base, date: '2027-04-06', name: 'Takes the slot' });
    await expect(ab.updateAdminBooking(b.id, { ...base, date: '2027-04-06', status: 'confirmed' })).rejects.toThrow(/overlaps Takes the slot/);
  });

  it('moves and resizes from the calendar, at least 5 minutes long', async () => {
    const [b] = await ab.createAdminBookings({ ...base, date: '2027-05-04' });
    const m = await ab.moveAdminBooking(b.id, new Date('2027-05-04T13:00:00+02:00'), new Date('2027-05-04T13:20:00+02:00'));
    expect(m?.duration_minutes).toBe(20);
    await expect(ab.moveAdminBooking(b.id, new Date('2027-05-04T13:00:00+02:00'), new Date('2027-05-04T13:02:00+02:00'))).rejects.toThrow(/5 minutes/);
  });

  it('deletes bookings with their payments, and removes a hand-recorded payment', async () => {
    const [a, b] = [(await ab.createAdminBookings({ ...base, date: '2027-06-01' }))[0], (await ab.createAdminBookings({ ...base, date: '2027-06-02' }))[0]];
    await recordInPersonPayment(a, 'cash', 65000);
    await recordInPersonPayment(b, 'eft', 65000);
    const pay = await one<{ id: number }>(`select id from payments where booking_id = $1`, [b.id]);
    await ab.deleteManualPayment(b.id, pay!.id);
    expect((await one<{ payment_status: string }>(`select payment_status from bookings where id = $1`, [b.id]))?.payment_status).toBe('unpaid');
    expect(await ab.deleteBookings([a.id, b.id])).toBe(2);
    expect((await q(`select 1 from payments where booking_id = any($1::uuid[])`, [[a.id, b.id]])).length).toBe(0);
  });

  it('changes many statuses at once; cancelling a paid one flags a refund', async () => {
    const made = await ab.createAdminBookings({ ...base, date: '2027-07-01', repeat: '1w', repeatCount: 2, name: 'Bulk' });
    await recordInPersonPayment(made[0], 'cash');
    expect(await ab.setStatusMany(made.map((b) => b.id), 'cancelled')).toBe(2);
    const rows = await q<{ status: string; payment_status: string }>(`select status, payment_status from bookings where patient_name = 'Bulk' order by start_at`);
    expect(rows).toEqual([{ status: 'cancelled', payment_status: 'refund_pending' }, { status: 'cancelled', payment_status: 'unpaid' }]);
  });
});
