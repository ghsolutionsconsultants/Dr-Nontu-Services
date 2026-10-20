import { describe, expect, it } from 'vitest';
import { lengthLabels, zoneFee, type Zone } from '../lib/fees';

const parks: Zone = { id: 1, name: 'The Parks Lifestyle Apartments', note: 'Fourways', price_cents: 60000, evening_price_cents: 80000, evening_from: 19 * 60 };
const quote: Zone = { id: 5, name: 'Beyond 15 km', note: '', price_cents: null, evening_price_cents: null, evening_from: null };

describe('fees', () => {
  it('writes lengths the way the practice does', () => {
    expect(lengthLabels([15, 30, 60])).toEqual(['Up to 15 minutes', '16–30 minutes', '31–60 minutes']);
    expect(lengthLabels([15, 30])).toEqual(['Up to 15 minutes', '16–30 minutes']);
  });

  it('charges The Parks the evening fee from 19:00 South African time', () => {
    expect(zoneFee(parks)).toBe(60000);
    expect(zoneFee(parks, '2026-10-21T18:45:00+02:00')).toBe(60000);
    expect(zoneFee(parks, '2026-10-21T19:00:00+02:00')).toBe(80000);
    expect(zoneFee(parks, new Date('2026-10-21T19:30:00Z'))).toBe(80000); // 21:30 SAST
  });

  it('has no online fee for areas that are quoted', () => {
    expect(zoneFee(quote, '2026-10-21T10:00:00+02:00')).toBeNull();
  });
});
