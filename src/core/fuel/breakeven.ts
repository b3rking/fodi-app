/**
 * Seuils de rentabilité, marges et verdict — fonctions pures.
 * Les phrases générées sont en français : ce sont elles qui expliquent l'app.
 */

export interface PerKmInputs {
  revenueFBu: number;
  revenueKm: number;
  fuelBurnCostFBu: number;
  otherCostsFBu: number;
  actualKmLitre: number | null;
  blendedPricePerLitre: number | null;
  tripCount: number;
}

export interface PerKmStats {
  revenuePerKm: number | null;
  fuelPerKm: number | null;
  otherPerKm: number | null;
  costPerKm: number | null;
  profitPerKm: number | null;
  profitMarginPct: number | null;
  fuelBreakEvenKmL: number | null;
  trueBreakEvenKmL: number | null;
  /** Marge moteur : de combien la conso peut empirer avant de perdre. */
  efficiencyMarginPct: number | null;
}

export function perKmStats(input: PerKmInputs): PerKmStats {
  const { revenueFBu, revenueKm, fuelBurnCostFBu, otherCostsFBu } = input;
  if (revenueKm <= 0) {
    return empty();
  }
  const revenuePerKm = revenueFBu / revenueKm;
  const fuelPerKm = fuelBurnCostFBu / revenueKm;
  const otherPerKm = otherCostsFBu / revenueKm;
  const costPerKm = fuelPerKm + otherPerKm;
  const profitPerKm = revenuePerKm - costPerKm;
  const profitMarginPct = revenuePerKm > 0 ? (profitPerKm / revenuePerKm) * 100 : null;
  const blended = input.blendedPricePerLitre;
  const fuelBreakEvenKmL =
    blended != null && revenuePerKm > 0 ? blended / revenuePerKm : null;
  const netPerKm = revenuePerKm - otherPerKm;
  const trueBreakEvenKmL = blended != null && netPerKm > 0 ? blended / netPerKm : null;
  const actual = input.actualKmLitre;
  const efficiencyMarginPct =
    actual != null && trueBreakEvenKmL != null && trueBreakEvenKmL > 0
      ? ((actual - trueBreakEvenKmL) / trueBreakEvenKmL) * 100
      : null;
  return {
    revenuePerKm,
    fuelPerKm,
    otherPerKm,
    costPerKm,
    profitPerKm,
    profitMarginPct,
    fuelBreakEvenKmL,
    trueBreakEvenKmL,
    efficiencyMarginPct,
  };
}

function empty(): PerKmStats {
  return {
    revenuePerKm: null,
    fuelPerKm: null,
    otherPerKm: null,
    costPerKm: null,
    profitPerKm: null,
    profitMarginPct: null,
    fuelBreakEvenKmL: null,
    trueBreakEvenKmL: null,
    efficiencyMarginPct: null,
  };
}

export type Verdict = 'making' | 'even' | 'losing' | 'unknown';

/** Seuils du plan : 15 % et plus = rentable, 0-15 % = équilibre, < 0 = perte. */
export function verdictFor(marginPct: number | null, tripCount: number): Verdict {
  if (tripCount < 3 || marginPct == null) return 'unknown';
  if (marginPct >= 15) return 'making';
  if (marginPct >= 0) return 'even';
  return 'losing';
}

// ---------------------------------------------------------------------------
// Cycles de plein (remplissage à plein → remplissage à plein suivant)
// ---------------------------------------------------------------------------

export interface CycleFill {
  ts: number;
  volumeL: number;
  pricePerLitre: number;
  litresBeforeL: number;
  litresAfterL: number;
  odometerKm: number | null;
}

export interface CycleTrip {
  ts: number;
  km: number;
  fare: number;
  extras: number;
}

export interface CycleBurn {
  startTs: number | null;
  endTs: number | null;
  consumedL: number;
  costFBu: number;
}

export interface TankCycle {
  number: number;
  startTs: number;
  endTs: number | null;
  done: boolean;
  filledL: number;
  fillCostFBu: number;
  km: number | null;
  faresFBu: number;
  burnL: number;
  burnCostFBu: number;
  profitFBu: number | null;
  /** Litres non brûlés à la fin du cycle (`null` si en cours : voir le suivi). */
  unburnedL: number | null;
  /** FUEL MONEY RECOVERED : recettes / coût du plein, en %. */
  recoveryPct: number | null;
}

/**
 * Découpe l'historique en cycles plein-à-plein. Un plein « à plein » =
 * niveau après ≥ 99,9 % de la capacité. Le dernier cycle est en cours.
 */
export function buildCycles(
  fills: CycleFill[],
  capacityL: number,
  trips: CycleTrip[],
  burns: CycleBurn[],
): TankCycle[] {
  const fullIdx = fills
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => f.litresAfterL + 1e-9 >= capacityL * 0.999)
    .map(({ i }) => i);
  if (fullIdx.length === 0) return [];
  const cycles: TankCycle[] = [];
  fullIdx.forEach((startI, n) => {
    const start = fills[startI];
    const endI = fullIdx[n + 1];
    const end = endI != null ? fills[endI] : null;
    const inWindow = <T extends { ts: number }>(items: T[]): T[] =>
      items.filter((t) => t.ts > start.ts && (end == null || t.ts <= end.ts));
    const windowTrips = inWindow(trips);
    const windowBurn = burns.filter(
      (b) =>
        (b.endTs ?? Number.NEGATIVE_INFINITY) > start.ts &&
        (end == null || (b.endTs ?? Number.POSITIVE_INFINITY) <= end.ts),
    );
    const km =
      end?.odometerKm != null && start.odometerKm != null && end.odometerKm > start.odometerKm
        ? end.odometerKm - start.odometerKm
        : null;
    const faresFBu = windowTrips.reduce((s, t) => s + t.fare + t.extras, 0);
    const burnL = windowBurn.reduce((s, b) => s + b.consumedL, 0);
    const burnCostFBu = windowBurn.reduce((s, b) => s + b.costFBu, 0);
    const fillCostFBu = start.volumeL * start.pricePerLitre;
    cycles.push({
      number: n + 1,
      startTs: start.ts,
      endTs: end?.ts ?? null,
      done: end != null,
      filledL: start.volumeL,
      fillCostFBu,
      km,
      faresFBu,
      burnL,
      burnCostFBu,
      profitFBu: km != null || windowTrips.length > 0 ? faresFBu - burnCostFBu : null,
      unburnedL: end != null ? end.litresBeforeL : null,
      recoveryPct: fillCostFBu > 0 ? (faresFBu / fillCostFBu) * 100 : null,
    });
  });
  return cycles;
}
