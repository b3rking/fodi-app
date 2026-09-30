/**
 * One store, one recompute.
 *
 * The database is the single source of truth. Derived numbers are recomputed
 * from it after every write rather than cached separately, so there is exactly
 * one place a mistake could hide and it is the pure core, which is tested.
 */

import * as SQLite from 'expo-sqlite';
import { create } from 'zustand';
import {
  blendedPrice,
  isAtReserve,
  kmLeftInTank,
  unrecoveredFuelMoney,
  type Tank,
} from '../core/fuel/engine';
import {
  computeBreakEven,
  explainBreakEven,
  totalsToPerKm,
  type BreakEven,
  type PerKm,
} from '../core/fuel/breakeven';
import { computeCycle, explainCycle, type CycleProgress } from '../core/fuel/cycle';
import { migrate } from '../db/schema';
import {
  burnBetweenFills,
  defaultVehicle,
  listFuelBuys,
  listFullFills,
  periodTotals,
  type PeriodTotalsRow,
  type VehicleRow,
} from '../db/queries';
import { afterWrite, rebuildTank } from '../db/rebuild';

export interface DaySummary {
  km: number;
  fares: number;
  fuelCost: number;
  otherCosts: number;
  otherIncome: number;
  profit: number;
  tripCount: number;
  /** Cash collected minus cash paid today, including fuel bought today. */
  cashInHand: number;
  fuelBoughtToday: number;
}

const EMPTY_PER_KM: PerKm = {
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

const EMPTY_TANK: Tank = { litres: 0, cost: 0, layers: [], capacityL: 60, reserveL: 5 };

const EMPTY_DAY: DaySummary = {
  km: 0,
  fares: 0,
  fuelCost: 0,
  otherCosts: 0,
  otherIncome: 0,
  profit: 0,
  tripCount: 0,
  cashInHand: 0,
  fuelBoughtToday: 0,
};

const EMPTY_CYCLE = computeCycle({
  fills: [],
  tank: EMPTY_TANK,
  odoAtCycleStart: null,
  odoNow: 0,
  faresEarned: 0,
  otherIncomeEarned: 0,
});

const EMPTY_BREAKEVEN = computeBreakEven({
  perKm: EMPTY_PER_KM,
  tank: EMPTY_TANK,
  actualKmPerL: null,
});

export interface AppState {
  ready: boolean;
  db: SQLite.SQLiteDatabase | null;
  vehicle: VehicleRow | null;
  tank: Tank;
  efficiency: number | null;
  today: DaySummary;
  perKm: PerKm;
  breakEven: BreakEven;
  breakEvenText: string;
  cycle: CycleProgress;
  cycleText: string;
  warnings: string[];
  error: string | null;
  /** Open the database, migrate, seed, and compute the first snapshot. */
  init(): Promise<void>;
  /** Rebuild every derived number from the database. */
  recompute(): Promise<void>;
  /** Run a write, mirror the file, then recompute. */
  write(fn: (db: SQLite.SQLiteDatabase) => Promise<void>): Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  db: null,
  vehicle: null,
  tank: EMPTY_TANK,
  efficiency: null,
  today: EMPTY_DAY,
  perKm: EMPTY_PER_KM,
  breakEven: EMPTY_BREAKEVEN,
  breakEvenText: '',
  cycle: EMPTY_CYCLE,
  cycleText: '',
  warnings: [],
  error: null,

  async init() {
    try {
      const db = await SQLite.openDatabaseAsync('fodi.db');
      await migrate(db);

      let vehicle = await defaultVehicle(db);
      if (!vehicle) {
        await db.runAsync(
          `INSERT INTO vehicle (name, plate, odometer_km, tank_cap_l, reserve_l, is_default)
           VALUES ('My taxi', NULL, 0, 60, 5, 1);`
        );
        vehicle = await defaultVehicle(db);
      }

      set({ db, vehicle });
      await get().recompute();
      set({ ready: true });
    } catch (error) {
      set({ error: (error as Error).message, ready: true });
    }
  },

  async recompute() {
    const { db } = get();
    if (!db) return;

    const vehicle = (await defaultVehicle(db)) ?? null;
    const rebuilt = await rebuildTank(db);

    const todayFrom = startOfDayIso();
    const todayTo = endOfDayIso();
    const windowFrom = startOfWindowIso(30);

    const todayTotals = await periodTotals(db, todayFrom, todayTo);
    const windowTotals = await periodTotals(db, windowFrom, todayTo);

    // Fuel cost comes from the FIFO engine, not from summing purchases: what he
    // burned this month may have been bought at a price from months ago.
    const windowFuelCost = await fuelCostBetween(db, windowFrom, todayTo);
    const todayFuelCost = await fuelCostBetween(db, todayFrom, todayTo);

    const perKm = totalsToPerKm({
      km: windowTotals.km,
      fares: windowTotals.fares,
      otherIncome: windowTotals.other_income,
      fuelCost: windowFuelCost,
      otherCosts: windowTotals.other_costs,
    });

    const today = await buildDaySummary(db, todayTotals, todayFuelCost);

    const breakEven = computeBreakEven({
      perKm,
      tank: rebuilt.tank,
      actualKmPerL: rebuilt.efficiency,
      tripCount: windowTotals.trip_count,
    });

    const cycle = computeCycle({
      fills: await cycleFills(db),
      tank: rebuilt.tank,
      odoAtCycleStart: await cycleStartOdo(db),
      odoNow: vehicle?.odometer_km ?? 0,
      faresEarned: windowTotals.fares,
      otherIncomeEarned: windowTotals.other_income,
      otherCosts: windowTotals.other_costs,
    });

    set({
      vehicle,
      tank: rebuilt.tank,
      efficiency: rebuilt.efficiency,
      today,
      perKm,
      breakEven,
      breakEvenText: explainBreakEven(breakEven, perKm),
      cycle,
      cycleText: explainCycle(cycle),
      warnings: rebuilt.warnings,
    });
  },

  async write(fn) {
    const { db } = get();
    if (!db) throw new Error('database not ready');
    await fn(db);
    afterWrite(db);
    await get().recompute();
  },
}));

/**
 * What the fuel he actually burned cost him across a window of fills.
 *
 * Sums the cost of everything that vanished between successive fills, priced
 * at what it cost when it went in. Buying 45 L on Monday and burning it over
 * three days costs him the whole 171 000 across those days, not 171 000 on the
 * Monday.
 */
async function fuelCostBetween(
  db: SQLite.SQLiteDatabase,
  fromIso: string,
  toIso: string
): Promise<number> {
  const buys = (await listFuelBuys(db, 1000))
    .filter((b) => b.ts >= fromIso && b.ts < toIso)
    .sort((a, b) => a.odometer_km - b.odometer_km);

  let total = 0;
  let prevOdo: number | null = null;
  let prevPrice = 0;

  for (const buy of buys) {
    if (prevOdo !== null) {
      const burn = await burnBetweenFills(db, prevOdo, buy.odometer_km);
      total += burn.efficiency.litres * prevPrice;
    }
    prevOdo = buy.odometer_km;
    prevPrice = buy.price_per_l;
  }

  return total;
}

async function buildDaySummary(
  db: SQLite.SQLiteDatabase,
  totals: PeriodTotalsRow,
  fuelCost: number
): Promise<DaySummary> {
  const fuel = await db.getFirstAsync<{ bought: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS bought FROM fuel_buy
     WHERE deleted_at IS NULL AND ts >= ? AND ts < ?;`,
    startOfDayIso(),
    endOfDayIso()
  );
  const fuelBoughtToday = fuel?.bought ?? 0;

  // Cash, not accounting: what is in his pocket today. Fuel bought today comes
  // straight out, which is the whole reason this sits under the profit figure.
  const cashInHand =
    totals.fares + totals.other_income - fuelBoughtToday - totals.other_costs;

  return {
    km: totals.km,
    fares: totals.fares,
    fuelCost,
    otherCosts: totals.other_costs,
    otherIncome: totals.other_income,
    profit: totals.fares + totals.other_income - fuelCost - totals.other_costs,
    tripCount: totals.trip_count,
    cashInHand,
    fuelBoughtToday,
  };
}

async function cycleFills(db: SQLite.SQLiteDatabase) {
  const fills = await listFullFills(db);
  return fills.map((f) => ({
    id: String(f.id),
    ts: f.ts,
    litres: f.volume_l,
    pricePerLitre: f.price_per_l,
    amount: f.amount,
    station: f.station,
  }));
}

async function cycleStartOdo(db: SQLite.SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ odometer_km: number }>(
    `SELECT odometer_km FROM fuel_buy WHERE deleted_at IS NULL AND fill_level = 'full'
     ORDER BY odometer_km DESC, ts DESC LIMIT 1;`
  );
  return row?.odometer_km ?? null;
}

// --- date helpers ----------------------------------------------------------
// A taxi day starts at 04:00: a driver who works past midnight still means
// "yesterday" by his own reckoning, not by the clock.

export function startOfDayIso(d = new Date()): string {
  const copy = new Date(d);
  copy.setHours(4, 0, 0, 0);
  return copy.toISOString();
}

export function endOfDayIso(d = new Date()): string {
  const copy = new Date(d);
  copy.setHours(4, 0, 0, 0);
  copy.setDate(copy.getDate() + 1);
  return copy.toISOString();
}

function startOfWindowIso(days: number, d = new Date()): string {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - days);
  return copy.toISOString();
}

// --- derived reads used by several screens ---------------------------------

export function selectTankValue(tank: Tank) {
  return {
    litres: tank.litres,
    value: unrecoveredFuelMoney(tank),
    blended: blendedPrice(tank),
    kmLeft: kmLeftInTank(tank, useAppStore.getState().efficiency),
    atReserve: isAtReserve(tank),
  };
}