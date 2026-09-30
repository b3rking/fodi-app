/**
 * Tank state: litres, unburned cost, and the FIFO queue of price layers.
 *
 * Pure functions only. No React, no SQLite. This is the part of the app that
 * must be provably right — see engine.test.ts.
 */

export type FillLevel = 'empty' | 'quarter' | 'half' | 'three_quarter' | 'full';

/** One purchase of fuel, still sitting in the tank. */
export interface FuelLayer {
  /** A stable id so layers survive serialisation round-trips. */
  id: string;
  /** Litres of this layer not yet burned. */
  litres: number;
  /** What he paid per litre, including any convenience fee spread in. */
  pricePerLitre: number;
  /** When it went in, for display and for "oldest fuel first" debugging. */
  boughtAt: string;
}

export interface Tank {
  /** Litres currently in the tank. */
  litres: number;
  /**
   * Cost of the fuel still in the tank, in FBu. This is money he has spent
   * but not yet turned into kilometres — "unrecovered fuel money".
   */
  cost: number;
  /** Oldest layer first. Always. */
  layers: FuelLayer[];
  /** Tank capacity in litres, for overflow checks and level presets. */
  capacityL: number;
  /** Below this level the Today screen says "time to fill up". */
  reserveL: number;
}

export const FILL_LEVEL_FRACTION: Record<FillLevel, number> = {
  empty: 0,
  quarter: 0.25,
  half: 0.5,
  three_quarter: 0.75,
  full: 1,
};

export function levelToLitres(level: FillLevel, capacityL: number): number {
  return capacityL * FILL_LEVEL_FRACTION[level];
}

export function emptyTank(capacityL: number, reserveL = 0): Tank {
  return { litres: 0, cost: 0, layers: [], capacityL, reserveL };
}

/** Fractions differ per fill preset; allow small drift from rounding. */
const LITRES_EPSILON = 1e-9;
const MONEY_EPSILON = 1e-6;

function round(value: number, dp = 6): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/**
 * The price he is actually running on right now: what the unburned fuel in the
 * tank cost him, per litre. Not the last price he paid — the weighted mix.
 * Null when the tank is empty, since the question has no answer.
 */
export function blendedPrice(tank: Tank): number | null {
  if (tank.litres <= LITRES_EPSILON) return null;
  return tank.cost / tank.litres;
}

/**
 * Fuel money sitting in the tank: paid for, not yet turned into kilometres.
 * A driver can be profitable and still have all his cash in the tank.
 */
export function unrecoveredFuelMoney(tank: Tank): number {
  return tank.cost;
}

/**
 * How far the remaining fuel can take him, at his recent economy.
 * Null if the tank is empty or we have no economy figure yet.
 */
export function kmLeftInTank(tank: Tank, kmPerLitre: number | null): number | null {
  if (kmPerLitre === null || !Number.isFinite(kmPerLitre) || kmPerLitre <= 0) return null;
  return tank.litres * kmPerLitre;
}

export function isAtReserve(tank: Tank): boolean {
  return tank.litres <= tank.reserveL + LITRES_EPSILON;
}

/** How much room is left, in litres. Never negative unless the tank is overfilled. */
export function headroomL(tank: Tank): number {
  return tank.capacityL - tank.litres;
}

export function isOverfill(volumeL: number, tank: Tank): boolean {
  return volumeL > headroomL(tank) + 1e-6;
}

/** The largest purchase that still fits, for the "you can only add N" warning. */
export function maxFillableL(tank: Tank): number {
  return Math.max(0, round(headroomL(tank), 3));
}

export interface RefillResult {
  tank: Tank;
  /** Total FBu spent, including the fee. */
  paid: number;
  /** Overfilled (data entry error) — the UI warns rather than silently clamping. */
  overfilled: boolean;
}

/**
 * Add fuel. Each purchase becomes its own layer, because he buys 2 L here,
 * 6 L there, then fills up — and every one of those has a different price.
 */
export function refill(
  tank: Tank,
  args: {
    id: string;
    volumeL: number;
    pricePerLitre: number;
    boughtAt: string;
    /** Convenience or service charge, spread across the litres. */
    fee?: number;
  }
): RefillResult {
  const { id, volumeL, pricePerLitre, boughtAt } = args;
  const fee = args.fee ?? 0;

  if (volumeL <= 0) throw new Error('refill: volumeL must be greater than zero');

  const overfilled = isOverfill(volumeL, tank);
  const total = volumeL * pricePerLitre + fee;
  const effectivePrice = total / volumeL;

  const tank2: Tank = {
    ...tank,
    litres: round(tank.litres + volumeL),
    cost: round(tank.cost + total),
    // Newest layer goes to the back: oldest fuel is burned first.
    layers: [...tank.layers, { id, litres: round(volumeL), pricePerLitre: round(effectivePrice), boughtAt }],
  };

  return { tank: tank2, paid: round(total), overfilled };
}

export interface ConsumeResult {
  tank: Tank;
  /** FBu cost of the fuel burned. */
  costOfBurnedFuel: number;
  /** Litres burned. */
  litresBurned: number;
  /** True if we ran out of known fuel before burning everything asked for. */
  shortfall: boolean;
}

/**
 * Burn fuel, oldest first (FIFO).
 *
 * Why FIFO: it is what actually happened physically, so "what did the last
 * 5 litres cost me" has one correct answer instead of a convenient one.
 *
 * If the request exceeds what we know is in the tank we burn everything we
 * have and report the shortfall rather than inventing a cost.
 */
export function consume(tank: Tank, litres: number): ConsumeResult {
  if (litres < 0) throw new Error('consume: litres cannot be negative');

  let remaining = round(litres);
  let costOfBurnedFuel = 0;
  const layers: FuelLayer[] = [];

  for (const layer of tank.layers) {
    if (remaining <= LITRES_EPSILON) {
      layers.push(layer);
      continue;
    }
    const take = Math.min(layer.litres, remaining);
    costOfBurnedFuel += take * layer.pricePerLitre;
    remaining = round(remaining - take);
    const left = round(layer.litres - take);
    if (left > LITRES_EPSILON) {
      layers.push({ ...layer, litres: left });
    }
    // a layer that hits zero is dropped: no empty layers hanging around
  }

  const litresBurned = round(litres - remaining);
  const shortfall = remaining > LITRES_EPSILON;

  return {
    tank: {
      ...tank,
      litres: round(Math.max(0, tank.litres - litresBurned)),
      cost: round(Math.max(0, tank.cost - costOfBurnedFuel)),
      layers,
    },
    costOfBurnedFuel: round(costOfBurnedFuel),
    litresBurned,
    shortfall,
  };
}

/**
 * Reconcile the tank to a stated level without pretending to know which layers
 * the fuel came from. Used when the driver says "I am at half".
 *
 * We burn (or credit) from the newest layer first, because that is the least
 * wrong guess: the fuel nearest the top of the tank is what he just added.
 * The cost is tracked honestly either way, so blendedPrice stays correct.
 */
export function setLevel(tank: Tank, litres: number): ConsumeResult {
  const target = round(Math.max(0, litres));
  const delta = round(target - tank.litres);

  if (delta === 0) {
    return { tank, costOfBurnedFuel: 0, litresBurned: 0, shortfall: false };
  }

  if (delta > 0) {
    // Claimed more fuel than we know about: add a layer at the last known
    // price so the average stays meaningful instead of dividing by a bigger L.
    const lastPrice = lastKnownPrice(tank);
    const res = refill(tank, {
      id: `reconciled-${Date.now()}`,
      volumeL: delta,
      pricePerLitre: lastPrice,
      boughtAt: new Date(0).toISOString(),
    });
    return { tank: res.tank, costOfBurnedFuel: 0, litresBurned: 0, shortfall: false };
  }

  // Too much fuel according to the tank: take the excess off the newest layer.
  return consumeNewest(tank, -delta);
}

function consumeNewest(tank: Tank, litres: number): ConsumeResult {
  let remaining = round(litres);
  let costOfBurnedFuel = 0;
  const layers = tank.layers.map((l) => ({ ...l }));

  for (let i = layers.length - 1; i >= 0 && remaining > LITRES_EPSILON; i--) {
    const layer = layers[i];
    const take = Math.min(layer.litres, remaining);
    costOfBurnedFuel += take * layer.pricePerLitre;
    remaining = round(remaining - take);
    layer.litres = round(layer.litres - take);
  }

  return {
    tank: {
      ...tank,
      litres: round(Math.max(0, tank.litres - litres)),
      cost: round(Math.max(0, tank.cost - costOfBurnedFuel)),
      layers: layers.filter((l) => l.litres > LITRES_EPSILON),
    },
    costOfBurnedFuel: round(costOfBurnedFuel),
    litresBurned: round(litres - remaining),
    shortfall: remaining > LITRES_EPSILON,
  };
}

/**
 * Best available price when we need one for a synthetic layer: mean of the
 * layers we hold, else null. Deliberately not a magic constant.
 */
export function lastKnownPrice(tank: Tank): number {
  const totalLitres = tank.layers.reduce((sum, l) => sum + l.litres, 0);
  if (totalLitres <= LITRES_EPSILON) return 0;
  const totalCost = tank.layers.reduce((sum, l) => sum + l.litres * l.pricePerLitre, 0);
  return round(totalCost / totalLitres);
}

/**
 * Guard against accumulated float drift: after many burns, litres and cost
 * should still reconcile with the layers. Cheap to run, catches real bugs.
 */
export function isConsistent(tank: Tank): boolean {
  const layerLitres = tank.layers.reduce((s, l) => s + l.litres, 0);
  const layerCost = tank.layers.reduce((s, l) => s + l.litres * l.pricePerLitre, 0);
  return (
    Math.abs(layerLitres - tank.litres) < 1e-6 &&
    Math.abs(layerCost - tank.cost) < MONEY_EPSILON
  );
}

/**
 * Litres burned between two readings, using the tank the way the driver
 * experiences it: what was in it, plus what he put in, minus what is left.
 *
 * Works for partial fills because the driver told us the end level with the
 * five big buttons. No interpolation anywhere in this app.
 */
export function litresBurnedBetween(
  litresAtStart: number,
  litresBought: number,
  litresAtEnd: number
): number {
  return round(Math.max(0, litresAtStart + litresBought - litresAtEnd));
}

export interface Efficiency {
  km: number;
  litres: number;
  /** Null when we cannot divide — never Infinity, never 0. */
  kmPerLitre: number | null;
}

export function efficiency(km: number, litres: number): Efficiency {
  const safeKm = Math.max(0, km);
  const safeLitres = Math.max(0, litres);
  return {
    km: safeKm,
    litres: safeLitres,
    kmPerLitre: safeLitres > LITRES_EPSILON ? round(safeKm / safeLitres) : null,
  };
}