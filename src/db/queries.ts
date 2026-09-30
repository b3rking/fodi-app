/**
 * Queries. Everything the screens need, in plain SQL against one local file.
 *
 * Derived values — fuel cost per trip, daily totals, efficiency — are computed
 * here on read rather than stored. At ~5 800 rows a year, correct-by-construction
 * beats fast-but-stale.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import { efficiency, litresBurnedBetween, type Efficiency, type FillLevel } from '../core/fuel/engine';
import { allocateFuel, type TripFuelShare } from '../core/fuel/allocate';

export interface TripRow {
  id: number;
  ts: string;
  from_place: string;
  to_place: string;
  km: number;
  fare: number;
  extras: number;
  fuel_l: number | null;
  fuel_cost: number | null;
  note: string | null;
}

export interface FuelBuyRow {
  id: number;
  ts: string;
  station: string | null;
  volume_l: number;
  price_per_l: number;
  amount: number;
  fee: number;
  odometer_km: number;
  fill_level: FillLevel;
  paid: number;
  receipt_uri: string | null;
}

export interface ExpenseRow {
  id: number;
  ts: string;
  category: string;
  amount: number;
  odometer_km: number | null;
  vendor: string | null;
  note: string | null;
}

export interface IncomeRow {
  id: number;
  ts: string;
  category: string;
  amount: number;
  note: string | null;
}

export interface VehicleRow {
  id: number;
  name: string;
  plate: string | null;
  odometer_km: number;
  tank_cap_l: number;
  reserve_l: number;
}

const alive = 'deleted_at IS NULL';

// --- vehicle ---------------------------------------------------------------

export async function defaultVehicle(db: SQLiteDatabase): Promise<VehicleRow | null> {
  return db.getFirstAsync<VehicleRow>(
    'SELECT id, name, plate, odometer_km, tank_cap_l, reserve_l FROM vehicle WHERE is_default = 1 LIMIT 1;'
  );
}

export async function updateVehicleOdometer(db: SQLiteDatabase, id: number, km: number): Promise<void> {
  await db.runAsync('UPDATE vehicle SET odometer_km = ? WHERE id = ?;', km, id);
}

// --- trips -----------------------------------------------------------------

export async function insertTrip(
  db: SQLiteDatabase,
  t: Omit<TripRow, 'id' | 'fuel_cost'>
): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO trip (ts, from_place, to_place, km, fare, extras, fuel_l, odo_from_km, odo_to_km, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    t.ts,
    t.from_place,
    t.to_place,
    t.km,
    t.fare,
    t.extras,
    t.fuel_l,
    (t as TripRow & { odo_from_km?: number }).odo_from_km ?? null,
    (t as TripRow & { odo_to_km?: number }).odo_to_km ?? null,
    t.note
  );
  return r.lastInsertRowId;
}

export async function listTrips(db: SQLiteDatabase, fromIso: string, toIso: string): Promise<TripRow[]> {
  return db.getAllAsync<TripRow>(
    `SELECT id, ts, from_place, to_place, km, fare, extras, fuel_l, fuel_cost, note
     FROM trip WHERE ${alive} AND ts >= ? AND ts < ? ORDER BY ts DESC;`,
    fromIso,
    toIso
  );
}

export async function recentPlaces(db: SQLiteDatabase, limit = 10): Promise<string[]> {
  const rows = await db.getAllAsync<{ place: string }>(
    `SELECT to_place AS place FROM trip WHERE ${alive} GROUP BY to_place
     ORDER BY MAX(ts) DESC LIMIT ?;`,
    limit
  );
  return rows.map((r) => r.place);
}

/** Average fare per km on a route, used to pre-fill the fare in the form. */
export async function usualFarePerKm(db: SQLiteDatabase, fromPlace: string, toPlace: string): Promise<number | null> {
  const row = await db.getFirstAsync<{ avg: number | null }>(
    `SELECT AVG(fare * 1.0 / NULLIF(km, 0)) AS avg FROM trip
     WHERE ${alive} AND from_place = ? AND to_place = ? AND km > 0;`,
    fromPlace,
    toPlace
  );
  return row?.avg ?? null;
}

export async function softDeleteTrip(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE trip SET deleted_at = ? WHERE id = ?;', new Date().toISOString(), id);
}

export async function restoreTrip(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('UPDATE trip SET deleted_at = NULL WHERE id = ?;', id);
}

// --- fuel ------------------------------------------------------------------

export async function insertFuelBuy(db: SQLiteDatabase, f: Omit<FuelBuyRow, 'id'>): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO fuel_buy
       (ts, vehicle_id, container, station, volume_l, price_per_l, amount, fee, odometer_km, fill_level, paid, receipt_uri)
     VALUES (?, (SELECT id FROM vehicle WHERE is_default = 1), 'tank', ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    f.ts,
    f.station,
    f.volume_l,
    f.price_per_l,
    f.amount,
    f.fee,
    f.odometer_km,
    f.fill_level,
    f.paid,
    f.receipt_uri
  );
  return r.lastInsertRowId;
}

export async function listFuelBuys(db: SQLiteDatabase, limit = 50): Promise<FuelBuyRow[]> {
  return db.getAllAsync<FuelBuyRow>(
    `SELECT id, ts, station, volume_l, price_per_l, amount, fee, odometer_km, fill_level, paid, receipt_uri
     FROM fuel_buy WHERE ${alive} ORDER BY odometer_km DESC, ts DESC LIMIT ?;`,
    limit
  );
}

export async function listFullFills(db: SQLiteDatabase): Promise<FuelBuyRow[]> {
  return db.getAllAsync<FuelBuyRow>(
    `SELECT id, ts, station, volume_l, price_per_l, amount, fee, odometer_km, fill_level, paid, receipt_uri
     FROM fuel_buy WHERE ${alive} AND fill_level = 'full' ORDER BY odometer_km ASC, ts ASC;`
  );
}

export async function insertReading(
  db: SQLiteDatabase,
  ts: string,
  odometerKm: number,
  litres: number,
  kind: 'start' | 'fuel' | 'trip' | 'manual'
): Promise<void> {
  await db.runAsync(
    `INSERT INTO tank_reading (ts, odometer_km, litres, kind, vehicle_id)
     VALUES (?, ?, ?, ?, (SELECT id FROM vehicle WHERE is_default = 1));`,
    ts,
    odometerKm,
    litres,
    kind
  );
}

export async function lastReading(db: SQLiteDatabase): Promise<{ odometer_km: number; litres: number } | null> {
  return db.getFirstAsync<{ odometer_km: number; litres: number }>(
    `SELECT odometer_km, litres FROM tank_reading WHERE ${alive}
     ORDER BY odometer_km DESC, ts DESC LIMIT 1;`
  );
}

export async function readingsBetween(db: SQLiteDatabase, fromIso: string, toIso: string) {
  return db.getAllAsync<{ ts: string; odometer_km: number; litres: number }>(
    `SELECT ts, odometer_km, litres FROM tank_reading WHERE ${alive} AND ts >= ? AND ts < ?
     ORDER BY odometer_km ASC, ts ASC;`,
    fromIso,
    toIso
  );
}

// --- money -----------------------------------------------------------------

export async function insertExpense(
  db: SQLiteDatabase,
  e: Omit<ExpenseRow, 'id'>
): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO expense (ts, category, amount, odometer_km, vendor, note) VALUES (?, ?, ?, ?, ?, ?);',
    e.ts,
    e.category,
    e.amount,
    e.odometer_km,
    e.vendor,
    e.note
  );
  return r.lastInsertRowId;
}

export async function insertIncome(db: SQLiteDatabase, i: Omit<IncomeRow, 'id'>): Promise<number> {
  const r = await db.runAsync(
    'INSERT INTO income (ts, category, amount, note) VALUES (?, ?, ?, ?);',
    i.ts,
    i.category,
    i.amount,
    i.note
  );
  return r.lastInsertRowId;
}

export async function listExpenses(db: SQLiteDatabase, fromIso: string, toIso: string): Promise<ExpenseRow[]> {
  return db.getAllAsync<ExpenseRow>(
    `SELECT id, ts, category, amount, odometer_km, vendor, note FROM expense
     WHERE ${alive} AND ts >= ? AND ts < ? ORDER BY ts DESC;`,
    fromIso,
    toIso
  );
}

export async function listIncome(db: SQLiteDatabase, fromIso: string, toIso: string): Promise<IncomeRow[]> {
  return db.getAllAsync<IncomeRow>(
    `SELECT id, ts, category, amount, note FROM income WHERE ${alive} AND ts >= ? AND ts < ?
     ORDER BY ts DESC;`,
    fromIso,
    toIso
  );
}

export async function expensesByCategory(db: SQLiteDatabase, fromIso: string, toIso: string) {
  return db.getAllAsync<{ category: string; total: number; count: number }>(
    `SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM expense
     WHERE ${alive} AND ts >= ? AND ts < ? GROUP BY category ORDER BY total DESC;`,
    fromIso,
    toIso
  );
}

export async function incomeByCategory(db: SQLiteDatabase, fromIso: string, toIso: string) {
  return db.getAllAsync<{ category: string; total: number; count: number }>(
    `SELECT category, SUM(amount) AS total, COUNT(*) AS count FROM income
     WHERE ${alive} AND ts >= ? AND ts < ? GROUP BY category ORDER BY total DESC;`,
    fromIso,
    toIso
  );
}

// --- settings --------------------------------------------------------------

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const r = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM setting WHERE key = ?;', key);
  return r?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;',
    key,
    value
  );
}

// --- the one query that powers the whole engine ----------------------------

export interface PeriodTotalsRow {
  km: number;
  fares: number;
  other_income: number;
  other_costs: number;
  trip_count: number;
}

/**
 * Everything the profit and break-even maths needs for a period, in one pass.
 * Fuel cost is NOT included here: it comes from the FIFO engine, because what
 * he burned may have been bought at a price from weeks ago.
 */
export async function periodTotals(
  db: SQLiteDatabase,
  fromIso: string,
  toIso: string
): Promise<PeriodTotalsRow> {
  const trips = await db.getFirstAsync<{ km: number; fares: number; count: number }>(
    `SELECT COALESCE(SUM(km), 0) AS km,
            COALESCE(SUM(fare + extras), 0) AS fares,
            COUNT(*) AS count
     FROM trip WHERE ${alive} AND ts >= ? AND ts < ?;`,
    fromIso,
    toIso
  );
  const income = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM income WHERE ${alive} AND ts >= ? AND ts < ?;`,
    fromIso,
    toIso
  );
  const costs = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expense WHERE ${alive} AND ts >= ? AND ts < ?;`,
    fromIso,
    toIso
  );

  return {
    km: trips?.km ?? 0,
    fares: trips?.fares ?? 0,
    other_income: income?.total ?? 0,
    other_costs: costs?.total ?? 0,
    trip_count: trips?.count ?? 0,
  };
}

/** Fuel burned between two fills, using the tank levels he reported. */
export async function burnBetweenFills(
  db: SQLiteDatabase,
  fromOdo: number,
  toOdo: number
): Promise<{ litres: number; km: number; efficiency: Efficiency }> {
  const prev = await db.getFirstAsync<{ litres: number }>(
    `SELECT litres FROM tank_reading WHERE ${alive} AND odometer_km <= ?
     ORDER BY odometer_km DESC, ts DESC LIMIT 1;`,
    fromOdo
  );
  const curr = await db.getFirstAsync<{ litres: number }>(
    `SELECT litres FROM tank_reading WHERE ${alive} AND odometer_km = ? ORDER BY ts DESC LIMIT 1;`,
    toOdo
  );

  const bought = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(volume_l), 0) AS total FROM fuel_buy
     WHERE ${alive} AND odometer_km > ? AND odometer_km <= ?;`,
    fromOdo,
    toOdo
  );

  const km = Math.max(0, toOdo - fromOdo);
  const litres = litresBurnedBetween(prev?.litres ?? 0, bought?.total ?? 0, curr?.litres ?? 0);
  return { litres, km, efficiency: efficiency(km, litres) };
}

/** Share one burn across the trips that happened during it. */
export async function allocateForWindow(
  db: SQLiteDatabase,
  fromOdo: number,
  toOdo: number,
  litres: number,
  cost: number
): Promise<TripFuelShare[]> {
  const trips = await db.getAllAsync<{ id: number; km: number; ts: string; fuel_l: number | null }>(
    `SELECT id, km, ts, fuel_l FROM trip WHERE ${alive} AND odo_from_km IS NOT NULL
       AND odo_to_km IS NOT NULL AND odo_from_km >= ? AND odo_to_km <= ?
     ORDER BY ts ASC;`,
    fromOdo,
    toOdo
  );
  return allocateFuel({
    trips: trips.map((t) => ({ id: String(t.id), km: t.km, startTs: t.ts, manualFuelL: t.fuel_l })),
    litresBurned: litres,
    costBurned: cost,
  });
}

/** Weighted average km/L over recent completed cycles — the honest "your economy" figure. */
export async function recentEfficiency(db: SQLiteDatabase, cycles = 10): Promise<number | null> {
  const fills = await listFullFills(db);
  if (fills.length < 2) return null;

  let totalKm = 0;
  let totalLitres = 0;
  for (let i = 1; i < fills.length; i++) {
    const burn = await burnBetweenFills(db, fills[i - 1].odometer_km, fills[i].odometer_km);
    totalKm += burn.efficiency.km;
    totalLitres += burn.efficiency.litres;
  }

  if (totalLitres <= 0) return null;
  return efficiency(totalKm, totalLitres).kmPerLitre;
}