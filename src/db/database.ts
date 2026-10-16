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
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      amount REAL NOT NULL,
      vendor TEXT,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS incomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT
    );
    CREATE TABLE IF NOT EXISTS recurrings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      cadence TEXT NOT NULL,
      next_due INTEGER NOT NULL,
      category_id TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS workdays (
      day TEXT PRIMARY KEY,
      odo_start REAL,
      odo_end REAL,
      started_ts INTEGER,
      ended_ts INTEGER,
      fuel_start_l REAL,
      fuel_end_l REAL
    );
  `);
  // Migration : ajoute les colonnes fuel si elles manquent (installs existantes).
  const existing = await database.getAllAsync<{ name: string }>(
    "SELECT name FROM pragma_table_info('workdays')",
  );
  const existingCols = new Set(existing.map((r) => r.name));
  if (!existingCols.has('fuel_start_l')) {
    await database.execAsync('ALTER TABLE workdays ADD COLUMN fuel_start_l REAL');
  }
  if (!existingCols.has('fuel_end_l')) {
    await database.execAsync('ALTER TABLE workdays ADD COLUMN fuel_end_l REAL');
  }
  await database.runAsync(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
    'tankCapL',
    String(DEFAULT_TANK_CAP_L),
  );
  for (const category of SEED_CATEGORIES) {
    await database.runAsync(
      'INSERT OR IGNORE INTO categories (id, kind, label) VALUES (?, ?, ?)',
      category.id,
      category.kind,
      category.label,
    );
  }
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
export async function getLevelFormat(): Promise<LevelLabelStyle> {  const database = await getDb();
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

export const DEFAULT_ACCENT = '#FF9800';

export function isAccentColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Couleur d'accent choisie (défaut : jaune de marque). */
export async function getAccentColor(): Promise<string> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    'accentColor',
  );
  return row && isAccentColor(row.value) ? row.value : DEFAULT_ACCENT;
}

export async function setAccentColor(color: string): Promise<void> {
  if (!isAccentColor(color)) {
    throw new Error('Code couleur invalide (ex. #FF9800).');
  }
  const database = await getDb();
  await database.runAsync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    'accentColor',
    color.toUpperCase(),
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

export async function listCategories(kind: CategoryKind): Promise<CategoryRow[]> {
  const database = await getDb();
  return database.getAllAsync<CategoryRow>(
    'SELECT id, kind, label FROM categories WHERE kind = ? ORDER BY label ASC',
    kind,
  );
}

export async function listExpenses(fromMs: number, toMs: number): Promise<ExpenseRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    ts: number;
    category_id: string;
    amount: number;
    vendor: string | null;
    note: string | null;
  }>('SELECT * FROM expenses WHERE ts >= ? AND ts < ? ORDER BY ts DESC, id DESC', fromMs, toMs);
  return rows.map((r) => ({
    id: r.id,
    ts: r.ts,
    categoryId: r.category_id,
    amount: r.amount,
    vendor: r.vendor,
    note: r.note,
  }));
}

export async function insertExpense(expense: NewExpense): Promise<number> {
  const database = await getDb();
  const result = await database
    .runAsync(
      'INSERT INTO expenses (ts, category_id, amount, vendor, note) VALUES (?, ?, ?, ?, ?)',
      expense.ts,
      expense.categoryId,
      expense.amount,
      expense.vendor ?? null,
      expense.note ?? null,
    )
    .catch((e: unknown) => {
      throw new Error(`insertExpense: ${e instanceof Error ? e.message : String(e)}`);
    });
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  return result.lastInsertRowId;
}

export async function updateExpense(id: number, expense: NewExpense): Promise<void> {
  const database = await getDb();
  await database
    .runAsync(
      'UPDATE expenses SET ts = ?, category_id = ?, amount = ?, vendor = ?, note = ? WHERE id = ?',
      expense.ts,
      expense.categoryId,
      expense.amount,
      expense.vendor ?? null,
      expense.note ?? null,
      id,
    )
    .catch((e: unknown) => {
      throw new Error(`updateExpense: ${e instanceof Error ? e.message : String(e)}`);
    });
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export async function deleteExpense(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM expenses WHERE id = ?', id);
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export async function listIncomes(fromMs: number, toMs: number): Promise<IncomeRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    ts: number;
    category_id: string;
    amount: number;
    note: string | null;
  }>('SELECT * FROM incomes WHERE ts >= ? AND ts < ? ORDER BY ts DESC, id DESC', fromMs, toMs);
  return rows.map((r) => ({
    id: r.id,
    ts: r.ts,
    categoryId: r.category_id,
    amount: r.amount,
    note: r.note,
  }));
}

export async function insertIncome(income: NewIncome): Promise<number> {
  const database = await getDb();
  const result = await database
    .runAsync('INSERT INTO incomes (ts, category_id, amount, note) VALUES (?, ?, ?, ?)', income.ts, income.categoryId, income.amount, income.note ?? null)
    .catch((e: unknown) => {
      throw new Error(`insertIncome: ${e instanceof Error ? e.message : String(e)}`);
    });
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  return result.lastInsertRowId;
}

export async function updateIncome(id: number, income: NewIncome): Promise<void> {
  const database = await getDb();
  await database
    .runAsync('UPDATE incomes SET ts = ?, category_id = ?, amount = ?, note = ? WHERE id = ?', income.ts, income.categoryId, income.amount, income.note ?? null, id)
    .catch((e: unknown) => {
      throw new Error(`updateIncome: ${e instanceof Error ? e.message : String(e)}`);
    });
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export async function deleteIncome(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM incomes WHERE id = ?', id);
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export async function listRecurrings(): Promise<RecurringRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    label: string;
    amount: number;
    cadence: string;
    next_due: number;
    category_id: string;
    active: number;
  }>('SELECT * FROM recurrings ORDER BY next_due ASC, id ASC');
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    amount: r.amount,
    cadence: r.cadence === 'weekly' ? 'weekly' : 'monthly',
    nextDue: r.next_due,
    categoryId: r.category_id,
    active: r.active,
  }));
}

export async function insertRecurring(rule: Omit<RecurringRow, 'id'>): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO recurrings (label, amount, cadence, next_due, category_id, active) VALUES (?, ?, ?, ?, ?, ?)',
    rule.label,
    rule.amount,
    rule.cadence,
    rule.nextDue,
    rule.categoryId,
    rule.active,
  );
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  return result.lastInsertRowId;
}

export async function updateRecurring(id: number, rule: Omit<RecurringRow, 'id'>): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    'UPDATE recurrings SET label = ?, amount = ?, cadence = ?, next_due = ?, category_id = ?, active = ? WHERE id = ?',
    rule.label,
    rule.amount,
    rule.cadence,
    rule.nextDue,
    rule.categoryId,
    rule.active,
    id,
  );
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export async function deleteRecurring(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM recurrings WHERE id = ?', id);
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}

export interface WorkdayRow {
  /** Jour local AAAA-MM-JJ. */
  day: string;
  odoStart: number | null;
  odoEnd: number | null;
  startedTs: number | null;
  endedTs: number | null;
  /** Litres estimés au départ (suivi photos + trajets). */
  fuelStartL: number | null;
  /** Litres estimés à la fermeture. */
  fuelEndL: number | null;
}

export async function getWorkday(day: string): Promise<WorkdayRow | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{
    day: string;
    odo_start: number | null;
    odo_end: number | null;
    started_ts: number | null;
    ended_ts: number | null;
    fuel_start_l: number | null;
    fuel_end_l: number | null;
  }>('SELECT * FROM workdays WHERE day = ?', day);
  if (!row) return null;
  return {
    day: row.day,
    odoStart: row.odo_start,
    odoEnd: row.odo_end,
    startedTs: row.started_ts,
    endedTs: row.ended_ts,
    fuelStartL: row.fuel_start_l,
    fuelEndL: row.fuel_end_l,
  };
}

export async function listWorkdays(fromDay: string, toDay: string): Promise<WorkdayRow[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    day: string;
    odo_start: number | null;
    odo_end: number | null;
    started_ts: number | null;
    ended_ts: number | null;
    fuel_start_l: number | null;
    fuel_end_l: number | null;
  }>('SELECT * FROM workdays WHERE day >= ? AND day <= ? ORDER BY day ASC', fromDay, toDay);
  return rows.map((row) => ({
    day: row.day,
    odoStart: row.odo_start,
    odoEnd: row.odo_end,
    startedTs: row.started_ts,
    endedTs: row.ended_ts,
    fuelStartL: row.fuel_start_l,
    fuelEndL: row.fuel_end_l,
  }));
}

export async function openWorkday(day: string, odoStart: number, fuelL: number | null): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO workdays (day, odo_start, started_ts, fuel_start_l)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       odo_start = excluded.odo_start,
       started_ts = excluded.started_ts,
       fuel_start_l = excluded.fuel_start_l`,
    day,
    odoStart,
    Date.now(),
    fuelL,
  );
}

export async function closeWorkday(day: string, odoEnd: number, fuelL: number | null): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO workdays (day, odo_end, ended_ts, fuel_end_l)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(day) DO UPDATE SET
       odo_end = excluded.odo_end,
       ended_ts = excluded.ended_ts,
       fuel_end_l = excluded.fuel_end_l`,
    day,
    odoEnd,
    Date.now(),
    fuelL,
  );
}

export type CategoryKind = 'cost' | 'income';

export interface CategoryRow {
  id: string;
  kind: CategoryKind;
  label: string;
}

export interface ExpenseRow {
  id: number;
  ts: number;
  categoryId: string;
  amount: number;
  vendor: string | null;
  note: string | null;
}

export interface IncomeRow {
  id: number;
  ts: number;
  categoryId: string;
  amount: number;
  note: string | null;
}

export type RecurrenceCadence = 'weekly' | 'monthly';

export interface RecurringRow {
  id: number;
  label: string;
  amount: number;
  cadence: RecurrenceCadence;
  nextDue: number;
  categoryId: string;
  active: number;
}

export interface NewExpense extends Omit<ExpenseRow, 'id'> {
  id?: number;
}

export interface NewIncome extends Omit<IncomeRow, 'id'> {
  id?: number;
}

const SEED_CATEGORIES: CategoryRow[] = [
  { id: 'maintenance', kind: 'cost', label: 'Entretien et réparations' },
  { id: 'tyres', kind: 'cost', label: 'Pneus' },
  { id: 'oil', kind: 'cost', label: 'Huile et vidange' },
  { id: 'insurance', kind: 'cost', label: 'Assurance' },
  { id: 'roadtax', kind: 'cost', label: 'Taxe de roulage' },
  { id: 'govlevy', kind: 'cost', label: 'Prélèvement État' },
  { id: 'data', kind: 'cost', label: 'Data et crédit' },
  { id: 'wash', kind: 'cost', label: 'Lavage' },
  { id: 'tolls', kind: 'cost', label: 'Péages et parking' },
  { id: 'fines', kind: 'cost', label: 'Amendes' },
  { id: 'union', kind: 'cost', label: 'Cotisations syndicat' },
  { id: 'other-cost', kind: 'cost', label: 'Autre dépense' },
  { id: 'delivery', kind: 'income', label: 'Livraison' },
  { id: 'hire', kind: 'income', label: 'Location voiture' },
  { id: 'tips', kind: 'income', label: 'Pourboires' },
  { id: 'bonus', kind: 'income', label: 'Prime' },
  { id: 'other-income', kind: 'income', label: 'Autre revenu' },
];

// ---------------------------------------------------------------------------
// Sauvegarde / restauration : export JSON complet + remplacement atomique.
// Le PIN et son sel restent dans le stockage sécurisé : jamais exportés.
// ---------------------------------------------------------------------------

/** Réglages exportés (blancs-seings : seules ces clés voyagent). */
export const BACKUP_SETTING_KEYS = [
  'tankCapL',
  'tankLevels',
  'fuelGauge',
  'levelFormat',
  'accentColor',
] as const;

export type BackupSettingKey = (typeof BACKUP_SETTING_KEYS)[number];

export interface BackupData {
  fills: FillRow[];
  trips: TripRow[];
  categories: CategoryRow[];
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  recurrings: RecurringRow[];
  workdays: WorkdayRow[];
  settings: { key: string; value: string }[];
}

/** Lit tous les réglages (pour filtrer ensuite les clés exportables). */
export async function getAllSettings(): Promise<{ key: string; value: string }[]> {
  const database = await getDb();
  return database.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM settings',
  );
}

function isBackupSettingKey(key: string): key is BackupSettingKey {
  return (BACKUP_SETTING_KEYS as readonly string[]).includes(key);
}

/** Vérifie une valeur de réglage avant import (invalide → ignorée). */
async function validateSettingValue(key: BackupSettingKey, value: string): Promise<boolean> {
  switch (key) {
    case 'tankCapL': {
      const n = Number(value);
      return Number.isFinite(n) && n >= 5 && n <= 500;
    }
    case 'tankLevels': {
      try {
        return validateTankLevels(JSON.parse(value) as TankLevelDef[]) === null;
      } catch {
        return false;
      }
    }
    case 'fuelGauge':
      return isFuelGaugeStyle(value);
    case 'levelFormat':
      return value === 'fractions' || value === 'percent';
    case 'accentColor':
      return isAccentColor(value);
  }
}

/**
 * Remplace TOUT le contenu par les données de sauvegarde, en une transaction.
 * Les lignes invalides lèvent une erreur et rien n'est appliqué.
 */
export async function importDatabase(data: BackupData): Promise<void> {
  if (!data || !Array.isArray(data.fills) || !Array.isArray(data.trips)) {
    throw new Error('Fichier de sauvegarde invalide.');
  }
  const database = await getDb();
  await database.withTransactionAsync(async () => {
    await database.execAsync(
      'DELETE FROM fills; DELETE FROM trips; DELETE FROM expenses; ' +
        'DELETE FROM incomes; DELETE FROM recurrings; DELETE FROM workdays; ' +
        'DELETE FROM categories;',
    );
    for (const f of data.fills) {
      await database.runAsync(
        `INSERT INTO fills
          (id, ts, station, volume_l, price_per_l, fee_fbu, odo_km, litres_before_l, litres_after_l)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        f.id,
        f.ts,
        f.station,
        f.volumeL,
        f.pricePerLitre,
        f.feeFBu,
        f.odoKm,
        f.litresBeforeL,
        f.litresAfterL,
      );
    }
    for (const t of data.trips) {
      await database.runAsync(
        `INSERT INTO trips
          (id, ts, from_place, to_place, km, fare, extras, odo_from_km, odo_to_km, fuel_l, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        t.id,
        t.ts,
        t.fromPlace ?? null,
        t.toPlace,
        t.km,
        t.fare,
        t.extras ?? 0,
        t.odoFromKm ?? null,
        t.odoToKm ?? null,
        t.fuelL ?? null,
        t.note ?? null,
      );
    }
    for (const c of data.categories) {
      if (c.kind !== 'cost' && c.kind !== 'income') throw new Error('Catégorie invalide.');
      await database.runAsync(
        'INSERT INTO categories (id, kind, label) VALUES (?, ?, ?)',
        c.id,
        c.kind,
        c.label,
      );
    }
    // Catégories personnalisées supprimées par erreur ? Les graines survivent.
    for (const category of SEED_CATEGORIES) {
      await database.runAsync(
        'INSERT OR IGNORE INTO categories (id, kind, label) VALUES (?, ?, ?)',
        category.id,
        category.kind,
        category.label,
      );
    }
    for (const e of data.expenses) {
      await database.runAsync(
        'INSERT INTO expenses (id, ts, category_id, amount, vendor, note) VALUES (?, ?, ?, ?, ?, ?)',
        e.id,
        e.ts,
        e.categoryId,
        e.amount,
        e.vendor ?? null,
        e.note ?? null,
      );
    }
    for (const i of data.incomes) {
      await database.runAsync(
        'INSERT INTO incomes (id, ts, category_id, amount, note) VALUES (?, ?, ?, ?, ?)',
        i.id,
        i.ts,
        i.categoryId,
        i.amount,
        i.note ?? null,
      );
    }
    for (const r of data.recurrings) {
      if (r.cadence !== 'weekly' && r.cadence !== 'monthly') {
        throw new Error('Récurrence invalide.');
      }
      await database.runAsync(
        `INSERT INTO recurrings (id, label, amount, cadence, next_due, category_id, active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        r.id,
        r.label,
        r.amount,
        r.cadence,
        r.nextDue,
        r.categoryId,
        r.active,
      );
    }
    for (const w of data.workdays) {
      await database.runAsync(
        `INSERT INTO workdays (day, odo_start, odo_end, started_ts, ended_ts, fuel_start_l, fuel_end_l)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        w.day,
        w.odoStart ?? null,
        w.odoEnd ?? null,
        w.startedTs ?? null,
        w.endedTs ?? null,
        w.fuelStartL ?? null,
        w.fuelEndL ?? null,
      );
    }
    for (const s of data.settings) {
      if (!isBackupSettingKey(s.key)) continue;
      if (!(await validateSettingValue(s.key, s.value))) continue;
      await database.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        s.key,
        s.value,
      );
    }
  });
  await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
}
