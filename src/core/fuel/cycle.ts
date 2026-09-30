/**
 * Tank cycle: "have I made back the fuel money yet?"
 *
 * A cycle runs from one fill-to-full to the next. Fuel is the one cost that
 * leaves the pocket long before it earns anything, so this is the card that
 * tells him whether he is ahead on the money he just spent.
 */

import { FuelLayer, Tank } from './engine';
import { fbu } from '../format';

export interface CycleFill {
  id: string;
  ts: string;
  litres: number;
  pricePerLitre: number;
  amount: number;
  station: string | null;
}

export interface CycleProgress {
  /** 1-based, for display: "Tank cycle #12". */
  number: number;
  /** The fill that opened this cycle. Null if he has never filled to full. */
  startedBy: CycleFill | null;
  /** Litres bought to open the cycle. */
  litresBought: number;
  /** FBu spent to open the cycle. */
  fuelPaid: number;
  /** Blended price of that purchase, FBu/L. */
  pricePerLitre: number | null;
  /** How much of that fuel is gone. */
  litresBurned: number;
  /** Cost of the fuel burned so far. */
  fuelCostBurned: number;
  km: number;
  kmPerLitre: number | null;
  /** Passenger fares and extra income earned while this cycle was running. */
  faresEarned: number;
  otherIncomeEarned: number;
  /** fares + otherIncome. Named explicitly because the copy depends on it. */
  revenue: number;
  /** FBu earned per km in this cycle. */
  revenuePerKm: number;
  /** Cost of the fuel burned per km. */
  fuelCostPerKm: number;
  /** fares + otherIncome − fuel burned cost − other costs. */
  profit: number;
  /** FBu still sitting in the tank: his money, not profit. */
  stillUnburnedL: number;
  stillUnburnedValue: number;
  /** FBu earned ÷ FBu of fuel burned, as a percentage. */
  recoveryPct: number;
  /** FBu still to earn before this cycle has paid for itself. */
  shortfallToBreakEven: number;
  complete: boolean;
}

export interface CycleInput {
  /** Every full-tank fill, oldest first. */
  fills: CycleFill[];
  /** Current tank. */
  tank: Tank;
  /** Odometer when the current cycle opened. */
  odoAtCycleStart: number | null;
  /** Odometer now. */
  odoNow: number;
  faresEarned: number;
  otherIncomeEarned: number;
  /** Non-fuel costs in this cycle. Kept separate so "profit from this tank" stays honest. */
  otherCosts?: number;
}

export function computeCycle(input: CycleInput): CycleProgress {
  const { fills, tank } = input;
  const opening = fills.length > 0 ? fills[fills.length - 1] : null;

  const litresBought = opening?.litres ?? 0;
  const fuelPaid = opening?.amount ?? 0;
  const pricePerLitre = opening && opening.litres > 0 ? opening.amount / opening.litres : null;

  // Fuel burned: what the cycle started with, minus what is left.
  const litresBurned = Math.max(0, litresBought - tank.litres);
  const fuelCostBurned = litresBurned * (pricePerLitre ?? 0);

  const km = input.odoAtCycleStart === null ? 0 : Math.max(0, input.odoNow - input.odoAtCycleStart);
  const kmPerLitre = litresBurned > 0 ? km / litresBurned : null;

  const revenue = input.faresEarned + input.otherIncomeEarned;
  const revenuePerKm = km > 0 ? revenue / km : 0;
  const fuelCostPerKm = km > 0 ? fuelCostBurned / km : 0;

  const otherCosts = input.otherCosts ?? 0;
  const profit = revenue - fuelCostBurned - otherCosts;

  const recoveryPct = fuelCostBurned > 0 ? (revenue / fuelCostBurned) * 100 : 0;
  const shortfallToBreakEven = Math.max(0, fuelCostBurned - revenue);

  return {
    number: fills.length,
    startedBy: opening,
    litresBought,
    fuelPaid,
    pricePerLitre,
    litresBurned,
    fuelCostBurned,
    km,
    kmPerLitre,
    faresEarned: input.faresEarned,
    otherIncomeEarned: input.otherIncomeEarned,
    revenue,
    revenuePerKm,
    fuelCostPerKm,
    profit,
    stillUnburnedL: tank.litres,
    stillUnburnedValue: tank.cost,
    recoveryPct,
    shortfallToBreakEven,
    complete: false,
  };
}

/** The sentence under the cycle card. */
export function explainCycle(c: CycleProgress): string {
  if (!c.startedBy) {
    return 'Fais un plein une fois et cette page suivra ce que ce carburant te rapporte.';
  }
  if (c.recoveryPct >= 100) {
    const times = (c.recoveryPct / 100).toFixed(1).replace('.', ',');
    return (
      `Tu as déjà récupéré ${times} fois le prix du carburant, et il reste encore ` +
      `${fbu(c.stillUnburnedValue)} dans le réservoir.`
    );
  }
  if (c.revenue > 0) {
    return (
      `Tu as récupéré ${Math.round(c.recoveryPct)} % du prix de ce carburant. Il te manque encore ` +
      `${fbu(c.shortfallToBreakEven)} de recettes avant que ce plein soit rentré.`
    );
  }
  return 'Note des trajets pour voir si le carburant est bien rentré.';
}

/**
 * Which fuel layers are still unburned, newest last — for a "what am I
 * running on right now" list, so the price difference between stations is
 * visible rather than averaged into one meaningless number.
 */
export function remainingLayers(tank: Tank): FuelLayer[] {
  return tank.layers.filter((l) => l.litres > 1e-9);
}