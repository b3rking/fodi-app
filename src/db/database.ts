import * as SQLite from 'expo-sqlite';
import { DEFAULT_TANK_LEVELS, validateTankLevels, type LevelLabelStyle, type TankLevelDef } from '../core/fuel/engine';

export interface FillRow {
  id: number;
  ts: number;
  station: string | null;
  volumeL: number;
  pricePerLitre: number;
  feeFBu: number;
  odoKm: number | null;
  litresBeforeL: number;
  litresAfterL: number;
}

export interface TripRow {
  id: number;
  ts: number;
  fromPlace: string | null;
  toPlace: string;
  km: number;
  fare: number;
  extras: number;
  odoFromKm: number | null;
  odoToKm: number | null;
  fuelL: number | null;
  note: string | null;
}

export interface NewTrip extends Omit<TripRow, 'id'> {
  id?: number;
}

export interface NewFill extends Omit<FillRow, 'id' | 'ts'> {
  ts?: number;
}

const DEFAULT_TANK_CAP_L = 60;

// Singleton sur promesse : deux inits en parallèle (carburant + trajets)
// ne doivent jamais ouvrir la base deux fois ni créer les tables deux fois.
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) dbPromise = SQLite.openDatabaseAsync('fodi.db');
  return dbPromise;
}

let initPromise: Promise<void> | null = null;

/** Crée les tables (pleins + trajets + réglages). Idempotent, thread-safe. */
export function initDatabase(): Promise<void> {
  if (!initPromise) initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<void> {
  const database = await getDb();
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS fills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      station TEXT,
      volume_l REAL NOT NULL,
      price_per_l REAL NOT NULL,
      fee_fbu REAL NOT NULL DEFAULT 0,
      odo_km REAL,
      litres_before_l REAL NOT NULL,
      litres_after_l REAL NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      from_place TEXT,
      to_place TEXT NOT NULL,
      km REAL NOT NULL,
      fare REAL NOT NULL,
      extras REAL NOT NULL DEFAULT 0,
      odo_from_km REAL,
      odo_to_km REAL,
      fuel_l REAL,
      note TEXT
    );
  `);
  await database.runAsync(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    'tankCapL',
    String(DEFAULT_TANK_CAP_L),
  );
  // La base reste un fichier unique et valide : checkpoint après chaque écriture.
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export async function getTankCapL(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    'tankCapL',
  );
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TANK_CAP_L;
}

export async function setTankCapL(capL: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    'tankCapL',
    String(capL),
  );
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

/** Niveaux personnalisés (JSON), défauts si absents ou corrompus. */
export async function getTankLevels(): Promise<TankLevelDef[]> {  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    'tankLevels',
  );
  if (row) {
    try {
      const parsed = JSON.parse(row.value) as TankLevelDef[];
      if (Array.isArray(parsed) && validateTankLevels(parsed) === null) return parsed;
    } catch {
      // Corrompu : on retombe sur les défauts ci-dessous.
    }
  }
  return DEFAULT_TANK_LEVELS;
}

export async function setTankLevels(levels: TankLevelDef[]): Promise<void> {
  const problem = validateTankLevels(levels);
  if (problem) throw new Error(problem);
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    'tankLevels',
    JSON.stringify(levels),
  );
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export type FuelGaugeStyle = 'bars' | 'needle' | 'litres';

const GAUGE_STYLES: FuelGaugeStyle[] = ['bars', 'needle', 'litres'];

export function isFuelGaugeStyle(value: unknown): value is FuelGaugeStyle {
  return typeof value === 'string' && (GAUGE_STYLES as string[]).includes(value);
}

/** Style de jauge préféré (défaut : barres, comme au tableau de bord). */
export async function getFuelGauge(): Promise<FuelGaugeStyle> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    'fuelGauge',
  );
  return row && isFuelGaugeStyle(row.value) ? row.value : 'bars';
}

export async function setFuelGauge(style: FuelGaugeStyle): Promise<void> {
  if (!isFuelGaugeStyle(style)) throw new Error('Style de jauge inconnu.');
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    'fuelGauge',
    style,
  );
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

/** Format des libellés de niveaux : fractions ou pourcentages (défaut : fractions). */
export async function getLevelFormat(): Promise<LevelLabelStyle> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    'levelFormat',
  );
  return row?.value === 'percent' ? 'percent' : 'fractions';
}

export async function setLevelFormat(style: LevelLabelStyle): Promise<void> {
  if (style !== 'fractions' && style !== 'percent') {
    throw new Error('Format de niveaux inconnu.');
  }
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    'levelFormat',
    style,
  );
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export async function listFills(): Promise<FillRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    ts: number;
    station: string | null;
    volume_l: number;
    price_per_l: number;
    fee_fbu: number;
    odo_km: number | null;
    litres_before_l: number;
    litres_after_l: number;
  }>('SELECT * FROM fills ORDER BY ts ASC, id ASC');
  return rows.map((r) => ({
    id: r.id,
    ts: r.ts,
    station: r.station,
    volumeL: r.volume_l,
    pricePerLitre: r.price_per_l,
    feeFBu: r.fee_fbu,
    odoKm: r.odo_km,
    litresBeforeL: r.litres_before_l,
    litresAfterL: r.litres_after_l,
  }));
}

export async function insertFill(fill: NewFill): Promise<FillRow> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO fills
      (ts, station, volume_l, price_per_l, fee_fbu, odo_km, litres_before_l, litres_after_l)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    fill.ts ?? Date.now(),
    fill.station,
    fill.volumeL,
    fill.pricePerLitre,
    fill.feeFBu,
    fill.odoKm,
    fill.litresBeforeL,
    fill.litresAfterL,
  );
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  const [created] = await listFills().then((all) => all.filter((f) => f.id === result.lastInsertRowId));
  if (!created) throw new Error('Plein introuvable après insertion.');
  return created;
}

export async function deleteFill(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM fills WHERE id = ?', id);
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

function toTripRow(r: {
  id: number;
  ts: number;
  from_place: string | null;
  to_place: string;
  km: number;
  fare: number;
  extras: number;
  odo_from_km: number | null;
  odo_to_km: number | null;
  fuel_l: number | null;
  note: string | null;
}): TripRow {
  return {
    id: r.id,
    ts: r.ts,
    fromPlace: r.from_place,
    toPlace: r.to_place,
    km: r.km,
    fare: r.fare,
    extras: r.extras,
    odoFromKm: r.odo_from_km,
    odoToKm: r.odo_to_km,
    fuelL: r.fuel_l,
    note: r.note,
  };
}

export async function listTrips(): Promise<TripRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    ts: number;
    from_place: string | null;
    to_place: string;
    km: number;
    fare: number;
    extras: number;
    odo_from_km: number | null;
    odo_to_km: number | null;
    fuel_l: number | null;
    note: string | null;
  }>('SELECT * FROM trips ORDER BY ts ASC, id ASC');
  return rows.map(toTripRow);
}

export async function insertTrip(trip: NewTrip): Promise<TripRow> {
  const database = await getDb();
  // `?? null` : le pont natif Android rejette les `undefined` (NPE au prepare).
  const params: (string | number | null)[] = [
    trip.ts ?? Date.now(),
    trip.fromPlace ?? null,
    trip.toPlace,
    trip.km,
    trip.fare,
    trip.extras ?? 0,
    trip.odoFromKm ?? null,
    trip.odoToKm ?? null,
    trip.fuelL ?? null,
    trip.note ?? null,
  ];
  const result = await database
    .runAsync(
      `INSERT INTO trips
        (ts, from_place, to_place, km, fare, extras, odo_from_km, odo_to_km, fuel_l, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ...params,
    )
    .catch((e: unknown) => {
      throw new Error(`insertTrip: ${e instanceof Error ? e.message : String(e)}`);
    });
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  const created = await database.getFirstAsync<{
    id: number;
    ts: number;
    from_place: string | null;
    to_place: string;
    km: number;
    fare: number;
    extras: number;
    odo_from_km: number | null;
    odo_to_km: number | null;
    fuel_l: number | null;
    note: string | null;
  }>('SELECT * FROM trips WHERE id = ?', result.lastInsertRowId);
  if (!created) throw new Error('Trajet introuvable après insertion.');
  return toTripRow(created);
}

export async function updateTrip(id: number, trip: NewTrip): Promise<void> {
  const database = await getDb();
  const params: (string | number | null)[] = [
    trip.ts ?? Date.now(),
    trip.fromPlace ?? null,
    trip.toPlace,
    trip.km,
    trip.fare,
    trip.extras ?? 0,
    trip.odoFromKm ?? null,
    trip.odoToKm ?? null,
    trip.fuelL ?? null,
    trip.note ?? null,
    id,
  ];
  await database
    .runAsync(
      `UPDATE trips SET
        ts = ?, from_place = ?, to_place = ?, km = ?, fare = ?, extras = ?,
        odo_from_km = ?, odo_to_km = ?, fuel_l = ?, note = ?
       WHERE id = ?`,
      ...params,
    )
    .catch((e: unknown) => {
      throw new Error(`updateTrip: ${e instanceof Error ? e.message : String(e)}`);
    });
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export async function deleteTrip(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM trips WHERE id = ?', id);
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}
