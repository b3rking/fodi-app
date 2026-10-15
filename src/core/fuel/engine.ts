/**
 * Moteur carburant — fonctions pures, sans React ni SQLite.
 *
 * Le réservoir est une file FIFO de couches de prix : chaque plein ajoute une
 * couche { litres, prix au litre }, et la consommation brûle toujours le
 * carburant le plus ancien d'abord. Les frais éventuels (service, Oraison…)
 * sont fondus dans le prix effectif de la couche, pour que le FIFO reste exact.
 */

export interface FillLayer {
  litres: number;
  /** Prix effectif au litre (frais inclus). `null` = litres d'ouverture au prix inconnu. */
  pricePerLitre: number | null;
}

export interface TankState {
  capacityL: number;
  layers: FillLayer[];
}

export interface TankLevelDef {
  id: string;
  /** Libellé affiché (ex. « ½ », « Plein », « Réserve »). */
  label: string;
  /** Fraction du réservoir, entre 0 et 1. */
  fraction: number;
}

/** Niveaux d'origine : Vide · ¼ · ½ · ¾ · Plein. */
export const DEFAULT_TANK_LEVELS: TankLevelDef[] = [
  { id: 'empty', label: 'Vide', fraction: 0 },
  { id: 'quarter', label: '¼', fraction: 0.25 },
  { id: 'half', label: '½', fraction: 0.5 },
  { id: 'threeQuarter', label: '¾', fraction: 0.75 },
  { id: 'full', label: 'Plein', fraction: 1 },
];

export const MIN_TANK_LEVELS = 2;
export const MAX_TANK_LEVELS = 12;

/** Libellé auto : symboles usuels, sinon pourcentage arrondi. */
export function autoLevelLabel(fraction: number): string {
  if (Math.abs(fraction) < 1e-9) return 'Vide';
  if (Math.abs(fraction - 1) < 1e-9) return 'Plein';
  if (Math.abs(fraction - 0.25) < 1e-9) return '¼';
  if (Math.abs(fraction - 0.5) < 1e-9) return '½';
  if (Math.abs(fraction - 0.75) < 1e-9) return '¾';
  if (Math.abs(fraction - 1 / 3) < 0.005) return '⅓';
  if (Math.abs(fraction - 2 / 3) < 0.005) return '⅔';
  return `${Math.round(fraction * 100)} %`;
}

/** Niveau le plus élevé atteint (toujours au moins le premier niveau). */
export function currentLevelLabel(levels: TankLevelDef[], fraction: number): string {
  const sorted = [...levels].sort((a, b) => a.fraction - b.fraction);
  let label = sorted[0]?.label ?? '';
  for (const level of sorted) {
    if (level.fraction - fraction < 1e-9) label = level.label;
  }
  return label;
}

/**
 * Génère `count` niveaux régulièrement espacés de 0 à 100 %,
 * comme les barres d'une jauge de voiture.
 */
export function levelsForBarCount(count: number): TankLevelDef[] {
  if (!Number.isInteger(count) || count < MIN_TANK_LEVELS || count > MAX_TANK_LEVELS) {
    throw new FuelError(
      'INVALID_LEVELS',
      `Le nombre de barres doit être entre ${MIN_TANK_LEVELS} et ${MAX_TANK_LEVELS}.`,
    );
  }
  return Array.from({ length: count }, (_, i) => {
    const fraction = count === 1 ? 1 : i / (count - 1);
    return { id: `bar-${i + 1}-of-${count}`, label: autoLevelLabel(fraction), fraction };
  });
}

export function litresFromFraction(fraction: number, capacityL: number): number {
  return fraction * capacityL;
}

/**
 * Valide une liste de niveaux personnalisés. `null` = valide,
 * sinon message d'erreur en français.
 */
export function validateTankLevels(levels: TankLevelDef[]): string | null {
  if (levels.length < MIN_TANK_LEVELS || levels.length > MAX_TANK_LEVELS) {
    return `Il faut entre ${MIN_TANK_LEVELS} et ${MAX_TANK_LEVELS} niveaux.`;
  }
  for (const level of levels) {
    if (level.label.trim() === '') return 'Chaque niveau doit avoir un nom.';
    if (!Number.isFinite(level.fraction) || level.fraction < 0 || level.fraction > 1) {
      return 'Chaque niveau doit être entre 0 et 100 %.';
    }
  }
  const labels = levels.map((l) => l.label.trim());
  if (new Set(labels).size !== labels.length) return 'Deux niveaux ont le même nom.';
  const fractions = [...levels.map((l) => l.fraction)].sort((a, b) => a - b);
  for (let i = 1; i < fractions.length; i++) {
    if (fractions[i] - fractions[i - 1] < 1e-9) return 'Deux niveaux ont le même pourcentage.';
  }
  if (Math.abs(fractions[0]) > 1e-9) return 'Le premier niveau doit être 0 %.';
  if (Math.abs(fractions[fractions.length - 1] - 1) > 1e-9) {
    return 'Le dernier niveau doit être 100 %.';
  }
  return null;
}

export function createEmptyTank(capacityL: number): TankState {
  if (!Number.isFinite(capacityL) || capacityL <= 0) {
    throw new FuelError('INVALID_CAPACITY', 'La capacité du réservoir doit être positive.');
  }
  return { capacityL, layers: [] };
}

export function totalLitres(tank: TankState): number {
  return tank.layers.reduce((sum, l) => sum + l.litres, 0);
}

/** Coût du carburant non brûlé (argent immobilisé dans le réservoir). */
export function tankCost(tank: TankState): number {
  return tank.layers.reduce((sum, l) => sum + l.litres * (l.pricePerLitre ?? 0), 0);
}

/**
 * Prix mixte (blended) du litre actuellement brûlé : C / L.
 * `null` si le réservoir est vide ou si son coût est inconnu (couches d'ouverture
 * au prix inconnu) — on affiche « — » plutôt qu'un mensonge.
 */
export function blendedPrice(tank: TankState): number | null {
  const litres = totalLitres(tank);
  if (litres <= 0) return null;
  const cost = tankCost(tank);
  if (cost <= 0) return null;
  return cost / litres;
}

/** Litres que l'on peut encore ajouter sans déborder. */
export function maxFillable(tank: TankState): number {
  return Math.max(0, tank.capacityL - totalLitres(tank));
}

export interface RefillInput {
  volumeL: number;
  pricePerLitre: number;
  /** Frais fixes fondus dans le coût (service, etc.). */
  feeFBu?: number;
}

/**
 * Ajoute un plein. Ne modifie pas l'état reçu (immuable).
 * Lève OVERFLOW si ça déborde — l'UI affiche le maximum exact via `maxFillable`.
 */
export function refill(tank: TankState, input: RefillInput): TankState {
  const { volumeL, pricePerLitre, feeFBu = 0 } = input;
  if (!Number.isFinite(volumeL) || volumeL <= 0) {
    throw new FuelError('INVALID_VOLUME', 'Le volume doit être strictement positif.');
  }
  if (!Number.isFinite(pricePerLitre) || pricePerLitre <= 0) {
    throw new FuelError('INVALID_PRICE', 'Le prix au litre doit être strictement positif.');
  }
  if (!Number.isFinite(feeFBu) || feeFBu < 0) {
    throw new FuelError('INVALID_FEE', 'Les frais ne peuvent pas être négatifs.');
  }
  const free = maxFillable(tank);
  if (volumeL - free > 1e-9) {
    throw new FuelError(
      'OVERFLOW',
      `Ça déborde : ${free.toFixed(1)} L maximum.`,
      { maxLitres: free },
    );
  }
  const effectivePrice = (volumeL * pricePerLitre + feeFBu) / volumeL;
  return {
    capacityL: tank.capacityL,
    layers: [...tank.layers, { litres: volumeL, pricePerLitre: effectivePrice }],
  };
}

export interface ConsumeResult {
  tank: TankState;
  /** Litres réellement déduits (plafonnés au contenu). */
  consumedL: number;
  /** Coût FIFO du carburant brûlé. */
  costFBu: number;
}

/** Brûle du carburant en FIFO. Ne modifie pas l'état reçu (immuable). */
export function consume(tank: TankState, litres: number): ConsumeResult {
  if (!Number.isFinite(litres) || litres < 0) {
    throw new FuelError('INVALID_VOLUME', 'La consommation ne peut pas être négative.');
  }
  const available = totalLitres(tank);
  let remaining = Math.min(litres, available);
  const consumedL = remaining;
  let costFBu = 0;
  const layers: FillLayer[] = tank.layers
    .map((l) => ({ ...l }))
    .filter((l) => l.litres > 0);
  while (remaining > 1e-9 && layers.length > 0) {
    const head = layers[0];
    const take = Math.min(head.litres, remaining);
    costFBu += take * (head.pricePerLitre ?? 0);
    head.litres -= take;
    remaining -= take;
    if (head.litres <= 1e-9) layers.shift();
  }
  return {
    tank: { capacityL: tank.capacityL, layers: layers.filter((l) => l.litres > 1e-9) },
    consumedL,
    costFBu,
  };
}

// ---------------------------------------------------------------------------
// Rejeu de l'historique des pleins
// ---------------------------------------------------------------------------

export interface FillEvent {
  volumeL: number;
  pricePerLitre: number;
  feeFBu?: number;
  /** Litres présents juste avant ce plein (photo précédente ou niveau d'ouverture). */
  litresBeforeL: number;
  /** Litres relevés juste après ce plein (boutons de niveau). */
  litresAfterL: number;
  odometerKm?: number | null;
}

export interface BurnInterval {
  /** Carburant brûlé entre la photo précédente et ce plein (FIFO). */
  consumedL: number;
  costFBu: number;
  km: number | null;
  /** km/L sur l'intervalle, `null` si incalculable (données manquantes). */
  kmPerLitre: number | null;
}

export interface TankReplay {
  tank: TankState;
  intervals: BurnInterval[];
  totalConsumedL: number;
  totalBurnCostFBu: number;
  totalKm: number | null;
  overallKmPerLitre: number | null;
}

/**
 * Rejoue les pleins dans l'ordre chronologique et reconstruit le réservoir :
 * pour chaque plein, on brûle d'abord (FIFO) ce qui a disparu depuis la photo
 * précédente, puis on empile la nouvelle couche.
 */
export function replayFills(capacityL: number, fills: FillEvent[]): TankReplay {
  let tank = createEmptyTank(capacityL);
  const intervals: BurnInterval[] = [];
  let totalConsumedL = 0;
  let totalBurnCostFBu = 0;
  let totalKm = 0;
  let hasKm = false;
  let prevOdo: number | null = null;

  fills.forEach((fill, index) => {
    if (index === 0 && fill.litresBeforeL > 1e-9) {
      // Fond de réservoir préexistant, prix inconnu : couche sans prix.
      tank = { capacityL, layers: [openingBalance(fill.litresBeforeL)] };
    }
    const have = totalLitres(tank);
    const before = Math.max(0, Math.min(fill.litresBeforeL, have));
    const disappeared = Math.max(0, have - before);
    const burned = consume(tank, disappeared);
    tank = burned.tank;

    const km =
      fill.odometerKm != null && prevOdo != null && fill.odometerKm > prevOdo
        ? fill.odometerKm - prevOdo
        : null;
    const kmPerLitre = km != null && burned.consumedL > 1e-9 ? km / burned.consumedL : null;

    intervals.push({ consumedL: burned.consumedL, costFBu: burned.costFBu, km, kmPerLitre });
    totalConsumedL += burned.consumedL;
    totalBurnCostFBu += burned.costFBu;
    if (km != null) {
      totalKm += km;
      hasKm = true;
    }

    tank = refill(tank, {
      volumeL: fill.volumeL,
      pricePerLitre: fill.pricePerLitre,
      feeFBu: fill.feeFBu ?? 0,
    });
    if (fill.odometerKm != null) prevOdo = fill.odometerKm;
  });

  return {
    tank,
    intervals,
    totalConsumedL,
    totalBurnCostFBu,
    totalKm: hasKm ? totalKm : null,
    overallKmPerLitre: hasKm && totalConsumedL > 1e-9 ? totalKm / totalConsumedL : null,
  };
}

/**
 * Litres d'ouverture au prix inconnu (premier plein : le fond de réservoir
 * existait déjà). On l'ajoute comme couche sans prix plutôt que d'inventer.
 */
export function openingBalance(litres: number): FillLayer {
  return { litres: Math.max(0, litres), pricePerLitre: null };
}

export class FuelError extends Error {
  code: 'INVALID_CAPACITY' | 'INVALID_VOLUME' | 'INVALID_PRICE' | 'INVALID_FEE' | 'INVALID_LEVELS' | 'OVERFLOW';
  details?: { maxLitres?: number };

  constructor(
    code: FuelError['code'],
    message: string,
    details?: { maxLitres?: number },
  ) {
    super(message);
    this.name = 'FuelError';
    this.code = code;
    this.details = details;
  }
}
