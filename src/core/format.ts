/** Formatting. FBu, kilometres, litres. Grouped the French/Burundian way. */

const NBSP = ' ';

/** FBu is the standard abbreviation (Franc Burundais). Used everywhere. */
const UNIT = 'FBu';

/** The em dash for "we do not know yet". Never 0, never a blank. */
const UNKNOWN = '—';

export function fbu(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '−' : '';
  const abs = Math.abs(rounded);
  const [int, dec] = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP).split('.');
  return `${sign}${int}${dec ? `.${dec}` : ''}${NBSP}FBu`;
}

/** Compact form for tight spaces: "45 000". The unit is stated nearby. */
export function fbuShort(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '−' : '';
  return `${sign}${Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)}`;
}

export function litres(value: number, dp = 1): string {
  return `${value.toFixed(dp)}${NBSP}L`;
}

export function km(value: number, dp = 1): string {
  return `${value.toFixed(dp)}${NBSP}km`;
}

export function kmPerLitre(value: number | null, dp = 1): string {
  return value === null ? '—' : `${value.toFixed(dp)}${NBSP}km/L`;
}

export function fbuPerKm(value: number): string {
  return `${fbuShort(value)}${NBSP}FBu/km`;
}

export function fbuPerLitre(value: number | null): string {
  return value === null ? '—' : `${fbuShort(value)}${NBSP}FBu/L`;
}

export function pct(value: number | null, dp = 0): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(dp)}%`;
}

/** "3 days ago", "today", "in 5 days" — for backup age and fill recency. */
export function relativeDays(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}