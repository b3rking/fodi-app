/**
 * Break-even: the numbers that answer "am I running without making money".
 *
 * All per-km figures are FBu per kilometre. Fuel prices are FBu per litre.
 * Dividing one by the other gives km/L, which is why these formulas are
 * written that way and not as ratios of two per-km numbers.
 */

import { blendedPrice, Tank } from './engine';
import { fbu } from '../format';

export interface PeriodTotals {
  km: number;
  /** Passenger fares plus trip extras (tips, tolls passed on). */
  fares: number;
  /** Everything else earned: delivery, car hire, bonuses. */
  otherIncome: number;
  /** Cost of fuel actually burned in this period. */
  fuelCost: number;
  /** Non-fuel expenses: maintenance, data, wash, insurance. */
  otherCosts: number;
}

export interface PerKm {
  km: number;
  revenue: number;
  revenuePerKm: number;
  fuelPerKm: number;
  otherPerKm: number;
  costPerKm: number;
  profitPerKm: number;
  profit: number;
  profitMarginPct: number;
}

export function totalsToPerKm(t: PeriodTotals): PerKm {
  const km = Math.max(0, t.km);
  const revenue = t.fares + t.otherIncome;

  if (km <= 0) {
    return {
      km: 0,
      revenue: 0,
      revenuePerKm: 0,
      fuelPerKm: 0,
      otherPerKm: 0,
      costPerKm: 0,
      profitPerKm: 0,
      profit: 0,
      profitMarginPct: 0,
    };
  }

  const revenuePerKm = revenue / km;
  const fuelPerKm = t.fuelCost / km;
  const otherPerKm = t.otherCosts / km;
  const costPerKm = fuelPerKm + otherPerKm;
  const profitPerKm = revenuePerKm - costPerKm;
  const profit = revenue - t.fuelCost - t.otherCosts;

  return {
    km,
    revenue,
    revenuePerKm,
    fuelPerKm,
    otherPerKm,
    costPerKm,
    profitPerKm,
    profit,
    profitMarginPct: revenue > 0 ? (profit / revenue) * 100 : 0,
  };
}

export type Verdict = 'making_money' | 'breaking_even' | 'losing_money' | 'not_enough_data';

export interface BreakEven {
  /** The price of the fuel currently in the tank, FBu/L. Null if tank empty. */
  blendedPrice: number | null;
  /** km/L needed to cover fuel only. */
  fuelBreakEvenKmPerL: number | null;
  /** km/L needed to cover fuel and all other running costs. */
  trueBreakEvenKmPerL: number | null;
  /** False when other costs already exceed income: no economy saves you. */
  breakEvenExists: boolean;
  /** His recent average, if we have enough data to trust it. */
  actualKmPerL: number | null;
  /**
   * How much worse his engine can get before he starts losing money.
   * Positive = margin. Negative = already losing.
   */
  efficiencyMarginPct: number | null;
  /** The same idea in absolute km/L, easier to read than a percentage. */
  efficiencyMarginKmPerL: number | null;
  verdict: Verdict;
}

export interface BreakEvenInput {
  perKm: PerKm;
  tank: Tank;
  /** Weighted average km/L over the window, or null if unknown. */
  actualKmPerL: number | null;
  /** Below this many trips in the window we refuse to give a verdict. */
  minTrips?: number;
  tripCount?: number;
}

export const DEFAULT_MIN_TRIPS = 3;

export function computeBreakEven(input: BreakEvenInput): BreakEven {
  const { perKm, tank } = input;
  const price = blendedPrice(tank);
  const minTrips = input.minTrips ?? DEFAULT_MIN_TRIPS;
  const tripCount = input.tripCount ?? 0;
  const hasData = tripCount >= minTrips && perKm.km > 0;

  // km/L needed to cover everything except fuel.
  const availableForFuel = perKm.revenuePerKm - perKm.otherPerKm;
  const breakEvenExists = price !== null && price > 0 && availableForFuel > 0;

  const fuelBreakEvenKmPerL =
    price !== null && price > 0 && perKm.revenuePerKm > 0 ? price / perKm.revenuePerKm : null;

  const trueBreakEvenKmPerL = breakEvenExists ? price / availableForFuel : null;

  const actual = input.actualKmPerL;
  const hasMargin = trueBreakEvenKmPerL !== null && actual !== null && trueBreakEvenKmPerL > 0;

  const efficiencyMarginKmPerL = hasMargin ? actual - trueBreakEvenKmPerL : null;
  const efficiencyMarginPct = hasMargin
    ? ((actual - trueBreakEvenKmPerL) / trueBreakEvenKmPerL) * 100
    : null;

  return {
    blendedPrice: price,
    fuelBreakEvenKmPerL,
    trueBreakEvenKmPerL,
    breakEvenExists,
    actualKmPerL: actual,
    efficiencyMarginPct,
    efficiencyMarginKmPerL,
    verdict: verdictFor(perKm, hasData),
  };
}

function verdictFor(perKm: PerKm, hasData: boolean): Verdict {
  if (!hasData) return 'not_enough_data';
  if (perKm.profitPerKm < 0) return 'losing_money';
  const margin = perKm.revenue > 0 ? perKm.profitMarginPct : 0;
  return margin >= 15 ? 'making_money' : 'breaking_even';
}

/**
 * The plain-language reason under the verdict chip. The app should read like
 * a person explaining it, so these sentences are the actual product copy.
 */
export function explainBreakEven(be: BreakEven, perKm: PerKm): string {
  if (be.verdict === 'not_enough_data') {
    return 'Log a few trips and we will work out your km/L automatically.';
  }

  if (!be.breakEvenExists) {
    return 'Your other costs already exceed your income. Even free fuel will not save you.';
  }

  const fmt = (n: number | null, dp = 1) => (n === null ? '—' : n.toFixed(dp));
  const need = be.trueBreakEvenKmPerL;
  const have = be.actualKmPerL;
  const margin = be.efficiencyMarginPct;

  // Without a known economy we can still state the break-even target, but not
  // say how far he is from it. Say only what is true.
  if (have === null) {
    return `You need ${fmt(need)} km/L to stay profitable. We will work out your own figure after a full tank.`;
  }

  if (be.verdict === 'losing_money') {
    const perTen = Math.abs(perKm.profitPerKm) * 10;
    const shortfall = be.efficiencyMarginKmPerL === null ? null : Math.abs(be.efficiencyMarginKmPerL);
    const fareFix = Math.abs(perKm.profitPerKm);
    return (
      `You need ${fmt(need)} km/L to stay profitable. You are ${fmt(have)} km/L — ` +
      `${fmt(shortfall)} km/L short. That is ${Math.round(fareFix)} FBu lost on every kilometre, ` +
      `about ${fbu(perTen)} for every 10 km you drive. ` +
      `Two ways out: drive ${fmt(shortfall)} km/L better, or charge ${Math.round(fareFix)} FBu more per km.`
    );
  }

  if (be.verdict === 'breaking_even') {
    return (
      `You need ${fmt(need)} km/L and you are averaging ${fmt(have)} km/L. ` +
      `You are making money, but there is no room for a bad day.`
    );
  }

  return (
    `You need ${fmt(need)} km/L and you are averaging ${fmt(have)} km/L. ` +
    `Your engine can get ${fmt(margin, 0)}% worse before you lose money.`
  );
}

/** One short line for the Today screen. */
export function verdictLabel(v: Verdict): string {
  switch (v) {
    case 'making_money':
      return 'MAKING MONEY';
    case 'breaking_even':
      return 'JUST BREAKING EVEN';
    case 'losing_money':
      return 'LOSING MONEY';
    default:
      return 'NOT ENOUGH DATA';
  }
}

/**
 * What today's profit would be if he keeps driving at this rate for a full
 * expected day. Extrapolation is clearly labelled as such in the UI.
 */
export function paceProjection(perKm: PerKm, expectedKmPerDay: number): number | null {
  if (perKm.km <= 0 || expectedKmPerDay <= 0) return null;
  return perKm.profitPerKm * expectedKmPerDay;
}