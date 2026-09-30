/**
 * Spreading burned fuel across the trips that used it.
 *
 * We know how much fuel vanished between two fills and how far he drove. We
 * do not know which trip used which litre, so we split it by kilometres —
 * standard practice, and every trip stays overridable by hand.
 */

export interface TripWithKm {
  id: string;
  km: number;
  startTs: string;
  /** Set by the driver if he wants to override the split. */
  manualFuelL: number | null;
}

export interface TripFuelShare {
  id: string;
  km: number;
  fuelL: number;
  cost: number;
  /** True when the driver overrode the automatic split. */
  manual: boolean;
}

export interface AllocationInput {
  trips: TripWithKm[];
  /** Litres burned across the whole window. */
  litresBurned: number;
  /** FBu cost of those litres. */
  costBurned: number;
}

/**
 * Manual entries win. Whatever fuel is left after the manual ones gets split
 * across the automatic ones by kilometres.
 */
export function allocateFuel(input: AllocationInput): TripFuelShare[] {
  const { trips, litresBurned, costBurned } = input;

  if (trips.length === 0) return [];

  const manual = trips.filter((t) => t.manualFuelL !== null);
  const auto = trips.filter((t) => t.manualFuelL === null);

  const manualLitres = manual.reduce((s, t) => s + (t.manualFuelL as number), 0);
  const remainingLitres = Math.max(0, litresBurned - manualLitres);

  // Cost per litre for the automatic share, derived from what is left over.
  const manualCostRatio = manualLitres > 0 && litresBurned > 0 ? manualLitres / litresBurned : 0;
  const remainingCost = costBurned * (1 - manualCostRatio);

  const autoKm = auto.reduce((s, t) => s + Math.max(0, t.km), 0);

  const shares = new Map<string, TripFuelShare>();

  for (const t of manual) {
    const litres = t.manualFuelL as number;
    // Price the manual litres at the window's average cost per litre.
    const costPerLitre = litresBurned > 0 ? costBurned / litresBurned : 0;
    shares.set(t.id, {
      id: t.id,
      km: t.km,
      fuelL: litres,
      cost: litres * costPerLitre,
      manual: true,
    });
  }

  for (const t of auto) {
    const share = autoKm > 0 ? Math.max(0, t.km) / autoKm : 0;
    const litres = remainingLitres * share;
    const cost = remainingCost * share;
    shares.set(t.id, { id: t.id, km: t.km, fuelL: litres, cost, manual: false });
  }

  return trips.map((t) => shares.get(t.id)).filter((s): s is TripFuelShare => s !== undefined);
}

/**
 * For a single trip being previewed before it is saved: how much fuel it will
 * cost at his current average economy, so the form can say the profit out loud.
 */
export function estimateTripFuel(
  km: number,
  kmPerLitre: number | null,
  pricePerLitre: number | null
): { litres: number | null; cost: number | null } {
  if (km <= 0 || kmPerLitre === null || kmPerLitre <= 0 || pricePerLitre === null) {
    return { litres: null, cost: null };
  }
  const litres = km / kmPerLitre;
  return { litres, cost: litres * pricePerLitre };
}