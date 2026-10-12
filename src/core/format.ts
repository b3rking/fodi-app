<<<<<<< HEAD
/**
 * Formatage : FBu, kilomètres, litres.
 *
 * Conventions françaises / burundaises :
 *   - thousands separator : espace insécable  (12 500)
 *   - décimale            : virgule          (22,5)
 *   - moins               : signe moins vrai (−)
 *
 * Sécurité : en français la virgule n'est JAMAIS un séparateur de milliers,
 * les milliers utilisant l'espace. "22,5 L" ne peut donc pas être confondu
 * avec "225 L". C'est important pour le carburant, où une erreur de lecture
 * coûte cher.
 */

/**
 * Espace insécable (U+00A0) pour le séparateur de milliers.
 *
 * Pas U+202F (espace fine insécable) : Product Sans ne contient pas ce
 * caractère, il s'afficherait avec la police de repli et casserait la lecture
 * des montants. U+00A0 est la convention française traditionnelle et il est
 * bien présent dans la police.
 */
const NBSP = ' ';

/** FBu = Franc Burundais. Utilisé partout. */
const UNIT = 'FBu';

/** Le tiret cadratin pour « on ne sait pas encore ». Jamais 0, jamais vide. */
const UNKNOWN = '—';

/** Virgule décimale française. */
function decimal(value: number, dp: number): string {
  return value.toFixed(dp).replace('.', ',');
}

/** Espaces insécables entre les milliers. */
function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function fbu(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '−' : '';
  return `${sign}${group(Math.abs(rounded).toString())}${NBSP}${UNIT}`;
}

/** Forme compacte pour les espaces serrés : « 45 000 ». L'unité est à côté. */
export function fbuShort(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '−' : '';
  return `${sign}${group(Math.abs(rounded).toString())}`;
}

export function litres(value: number, dp = 1): string {
  return `${decimal(value, dp)}${NBSP}L`;
}

export function km(value: number, dp = 1): string {
  return `${decimal(value, dp)}${NBSP}km`;
}

export function kmPerLitre(value: number | null, dp = 1): string {
  return value === null ? UNKNOWN : `${decimal(value, dp)}${NBSP}km/L`;
}

export function fbuPerKm(value: number): string {
  return `${fbuShort(value)}${NBSP}${UNIT}/km`;
}

export function fbuPerLitre(value: number | null): string {
  return value === null ? UNKNOWN : `${fbuShort(value)}${NBSP}${UNIT}/L`;
}

/** Pourcentage. En français, espace insécable avant le signe pour cent. */
export function pct(value: number | null, dp = 0): string {
  if (value === null || !Number.isFinite(value)) return UNKNOWN;
  return `${decimal(value, dp)}${NBSP}%`;
}

/** Ancienneté d'une sauvegarde ou d'un plein, en français naturel. */
export function relativeDays(days: number): string {
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return 'la semaine dernière';
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks === 1 ? 'il y a 1 semaine' : `il y a ${weeks} semaines`;
  }
  const months = Math.round(days / 30);
  return months <= 1 ? 'il y a 1 mois' : `il y a ${months} mois`;
=======
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
>>>>>>> a445be3381f7094f093f3f61099952c08cf806db
}