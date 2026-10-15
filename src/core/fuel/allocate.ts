/**
 * Répartition du carburant brûlé entre les trajets, au prorata des km.
 * Pur, sans React ni SQLite : chaque fenêtre de combustion (entre deux
 * photos du réservoir) est partagée entre les trajets qu'elle contient.
 */

export interface BurnWindow {
  /** Fin de la fenêtre précédente (exclue), `null` si inconnue. */
  startTs: number | null;
  /** Fin de la fenêtre (incluse), `null` si inconnue. */
  endTs: number | null;
  consumedL: number;
  costFBu: number;
}

export interface TripInput {
  id: number;
  ts: number;
  km: number;
}

export interface TripShare {
  tripId: number;
  /** Litres alloués, `null` si incalculable (hors fenêtre, km nuls…). */
  fuelL: number | null;
  fuelCostFBu: number | null;
}

/** Fenêtre contenant ce trajet, `null` si aucune (trajet hors historique). */
export function windowForTs(windows: BurnWindow[], ts: number): BurnWindow | null {
  for (const w of windows) {
    const afterStart = w.startTs == null || ts > w.startTs;
    const beforeEnd = w.endTs == null || ts <= w.endTs;
    if (afterStart && beforeEnd && w.consumedL > 1e-9) return w;
  }
  return null;
}

export function allocateFuel(windows: BurnWindow[], trips: TripInput[]): TripShare[] {
  return trips.map((trip) => {
    if (!Number.isFinite(trip.km) || trip.km <= 0) {
      return { tripId: trip.id, fuelL: null, fuelCostFBu: null };
    }
    const window = windowForTs(windows, trip.ts);
    if (!window) return { tripId: trip.id, fuelL: null, fuelCostFBu: null };
    const siblings = trips.filter(
      (t) =>
        t.id !== trip.id &&
        Number.isFinite(t.km) &&
        t.km > 0 &&
        windowForTs(windows, t.ts) === window,
    );
    const totalKm = trip.km + siblings.reduce((sum, t) => sum + t.km, 0);
    if (totalKm <= 1e-9) return { tripId: trip.id, fuelL: null, fuelCostFBu: null };
    const fuelL = (window.consumedL * trip.km) / totalKm;
    const fuelCostFBu = (window.costFBu * trip.km) / totalKm;
    return { tripId: trip.id, fuelL, fuelCostFBu };
  });
}

export interface PricedTripInput extends TripInput {
  fare: number;
  extras: number;
  /** Surcharge manuelle (prioritaire). */
  manualFuelL?: number | null;
}

export interface PricedTrip {
  tripId: number;
  fuelL: number | null;
  fuelCostFBu: number | null;
  profitFBu: number | null;
}

/**
 * Coût carburant + profit par trajet : surcharge manuelle valorisée au prix
 * de sa fenêtre (sinon prix mixte courant), sinon part allouée au prorata.
 */
export function priceTrips(
  trips: PricedTripInput[],
  windows: BurnWindow[],
  blendedPricePerLitre: number | null,
): PricedTrip[] {
  const shares = new Map(allocateFuel(windows, trips).map((s) => [s.tripId, s]));
  return trips.map((trip) => {
    const share = shares.get(trip.id);
    let fuelL = trip.manualFuelL ?? share?.fuelL ?? null;
    if (fuelL != null && !(fuelL >= 0)) fuelL = null;
    let fuelCostFBu: number | null = null;
    if (fuelL != null) {
      const window = windowForTs(windows, trip.ts);
      const price =
        window && window.consumedL > 1e-9 ? window.costFBu / window.consumedL : blendedPricePerLitre;
      fuelCostFBu = price != null ? fuelL * price : null;
    } else if (share?.fuelCostFBu != null) {
      fuelL = share.fuelL;
      fuelCostFBu = share.fuelCostFBu;
    }
    return {
      tripId: trip.id,
      fuelL,
      fuelCostFBu,
      profitFBu: fuelCostFBu != null ? trip.fare + trip.extras - fuelCostFBu : null,
    };
  });
}
