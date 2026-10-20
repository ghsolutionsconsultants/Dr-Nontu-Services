// Fee rules shared by the booking page, the server and the admin (no server imports, safe in the browser).
// In person and virtual are priced by length; house calls by where the patient is, with an optional evening fee.

export interface Zone {
  id: number; name: string; note: string;
  /** null: no online booking, the patient asks for a quote */
  price_cents: number | null;
  evening_price_cents: number | null;
  /** minutes after midnight (SAST) from which the evening fee applies */
  evening_from: number | null;
}

/** Minutes after midnight in South Africa (SAST, no daylight saving). */
export const sastMinutesOf = (d: Date) => ((d.getUTCHours() + 2) % 24) * 60 + d.getUTCMinutes();
export const clock = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** The fee for a house call in this area, at this start time (before a time is chosen: the daytime fee). */
export function zoneFee(z: Zone, start?: Date | string | null): number | null {
  if (z.price_cents == null) return null;
  const at = start ? new Date(start) : null;
  if (at && z.evening_price_cents != null && z.evening_from != null && sastMinutesOf(at) >= z.evening_from) return z.evening_price_cents;
  return z.price_cents;
}

/** The practice's way of writing lengths: "Up to 15 minutes", "16–30 minutes", "31–60 minutes". */
export function lengthLabels(minutes: number[]) {
  return minutes.map((m, i) => (i === 0 ? `Up to ${m} minutes` : `${minutes[i - 1] + 1}–${m} minutes`));
}
export const shortLength = (label: string) => label.replace(' minutes', ' min');
