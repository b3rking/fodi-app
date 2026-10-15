/**
 * Formatage français : espace insécable étroite pour les milliers (`12 500`),
 * virgule décimale (`22,5 L`). Formatage manuel (pas d'Intl) pour un rendu
 * identique sur l'appareil et en test.
 */

const NARROW_NBSP = ' ';

function groupThousands(rounded: number): string {
  const digits = String(Math.abs(rounded));
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
  return (rounded < 0 ? '-' : '') + grouped;
}

/** `45000` → `45 000 FBu`. Montants arrondis au franc. */
export function formatFBu(amountFBu: number): string {
  return `${groupThousands(Math.round(amountFBu))} FBu`;
}

/** `22.5` → `22,5 L`. Une décimale. */
export function formatLitres(litres: number): string {
  return `${litres.toFixed(1).replace('.', ',')} L`;
}

/** `3800` → `3 800 FBu/L`. */
export function formatPricePerLitre(priceFBuPerL: number): string {
  return `${groupThousands(Math.round(priceFBuPerL))} FBu/L`;
}

/** `10.8` → `10,8 km/L`, `null` → `—`. */
export function formatKmPerLitre(kmPerLitre: number | null | undefined): string {
  if (kmPerLitre == null || !Number.isFinite(kmPerLitre)) return '—';
  return `${kmPerLitre.toFixed(1).replace('.', ',')} km/L`;
}

/** `2026-10-15` → `15 oct. 2026` (court, français). */
const MONTHS_FR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export function formatDayFr(timestampMs: number): string {
  const d = new Date(timestampMs);
  return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}
