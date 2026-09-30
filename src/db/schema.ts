/**
 * SQLite schema and migrations.
 *
 * Local-first: there is no server and there never will be. The whole database
 * is one file, ~1.3 MB a year, which is what makes a full-file backup sane
 * (see src/core/backup.ts).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

export const SCHEMA_VERSION = 1;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS vehicle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      plate TEXT,
      odometer_km REAL NOT NULL DEFAULT 0,
      tank_cap_l REAL NOT NULL DEFAULT 60,
      reserve_l REAL NOT NULL DEFAULT 5,
      can_cap_l REAL NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 1
    );`,

    // Every (odometer, litres) snapshot. The source of truth for consumption.
    `CREATE TABLE IF NOT EXISTS tank_reading (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      odometer_km REAL NOT NULL,
      litres REAL NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('start','fuel','trip','manual')),
      vehicle_id INTEGER NOT NULL REFERENCES vehicle(id),
      deleted_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS fuel_buy (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      vehicle_id INTEGER NOT NULL REFERENCES vehicle(id),
      container TEXT NOT NULL DEFAULT 'tank',
      station TEXT,
      volume_l REAL NOT NULL,
      price_per_l REAL NOT NULL,
      amount REAL NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      odometer_km REAL NOT NULL,
      fill_level TEXT NOT NULL CHECK (fill_level IN ('empty','quarter','half','three_quarter','full')),
      paid INTEGER NOT NULL DEFAULT 1,
      receipt_uri TEXT,
      note TEXT,
      deleted_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS trip (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      from_place TEXT NOT NULL,
      to_place TEXT NOT NULL,
      km REAL NOT NULL,
      fare REAL NOT NULL,
      extras REAL NOT NULL DEFAULT 0,
      odo_from_km REAL,
      odo_to_km REAL,
      fuel_l REAL,
      fuel_cost REAL,
      passengers INTEGER,
      payment TEXT,
      note TEXT,
      deleted_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS expense (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      odometer_km REAL,
      vendor TEXT,
      note TEXT,
      deleted_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      deleted_at TEXT
    );`,

    `CREATE TABLE IF NOT EXISTS recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      cadence TEXT NOT NULL CHECK (cadence IN ('daily','weekly','monthly','yearly')),
      next_due TEXT NOT NULL,
      category TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );`,

    `CREATE TABLE IF NOT EXISTS setting (
      key TEXT PRIMARY KEY,
      value TEXT
    );`,

    `CREATE INDEX IF NOT EXISTS idx_trip_ts ON trip(ts);`,
    `CREATE INDEX IF NOT EXISTS idx_fuel_ts ON fuel_buy(ts);`,
    `CREATE INDEX IF NOT EXISTS idx_fuel_odo ON fuel_buy(odometer_km);`,
    `CREATE INDEX IF NOT EXISTS idx_reading_odo ON tank_reading(odometer_km);`,
    `CREATE INDEX IF NOT EXISTS idx_expense_ts ON expense(ts);`,
    `CREATE INDEX IF NOT EXISTS idx_income_ts ON income(ts);`,
  ],
};

export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL);`);

  const row = await db.getFirstAsync<{ version: number }>('SELECT MAX(version) AS version FROM schema_version;');
  const current = row?.version ?? 0;

  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const statements = MIGRATIONS[v] ?? [];
    for (const sql of statements) {
      await db.execAsync(sql);
    }
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?);', v);
  }
}

/** Categories seeded for real taxi work, not generic bookkeeping. */
export const COST_CATEGORIES = [
  'Maintenance & repairs',
  'Tyres',
  'Oil & servicing',
  'Insurance',
  'Road tax & levies',
  'Government levy',
  'Data / airtime',
  'Car wash',
  'Tolls & parking',
  'Fines',
  'Union dues',
  'Other',
] as const;

export const INCOME_CATEGORIES = [
  'Passenger fare',
  'Delivery / courier',
  'Car hire',
  'Tips',
  'Bonus',
  'Wash & detailing',
  'Other',
] as const;

export const DEFAULT_SETTINGS = {
  currency: 'FBU',
  units: 'metric',
  day_start_hour: '4',
  week_start: '1',
  expected_km_per_day: '80',
  last_backup_at: '',
} as const;