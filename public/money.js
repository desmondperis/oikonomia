/* Money, in one place.
 *
 * Held as whole paise everywhere so that arithmetic is exact, and shown in
 * Indian grouping — ₹1,20,250, not ₹120,250.
 */

const WHOLE = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0
});

const EXACT = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2
});

/** Paise to something a person reads. Paise are only shown when they exist. */
export function formatPaise(paise) {
  const value = Number(paise) || 0;
  const formatter = value % 100 === 0 ? WHOLE : EXACT;
  return formatter.format(value / 100).replace(/^₹\s?/, '₹');
}

/** What a person typed into a rupee box. Returns paise, or null if unusable. */
export function readRupees(input) {
  const cleaned = String(input).replace(/[\s,₹]/g, '');
  if (!cleaned) return null;
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value > 10_000_000) return null;

  return Math.round(value * 100);
}
