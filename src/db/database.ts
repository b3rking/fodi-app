import * as SQLite from 'expo-sqlite';

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

export interface NewFill extends Omit<FillRow, 'id' | 'ts'> {
  ts?: number;
}

const DEFAULT_TANK_CAP_L = 60;

let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) db = await SQLite.openDatabaseAsync('fodi.db');
  return db;
}

/** Crée les tables (pleins + réglages). Idempotent. */
export async function initDatabase(): Promise<void> {
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
