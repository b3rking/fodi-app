import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import {
  BACKUP_SETTING_KEYS,
  getAllSettings,
  importDatabase,
  listCategories,
  listExpenses,
  listFills,
  listIncomes,
  listRecurrings,
  listTrips,
  listWorkdays,
  type BackupData,
  type CategoryRow,
  type ExpenseRow,
  type FillRow,
  type IncomeRow,
  type RecurringRow,
  type TripRow,
  type WorkdayRow,
} from '../db/database';
import { getLockTimeoutMs, setLockTimeoutMs, setCurrentTimeout } from './lock';
import { useFuelStore } from '../store/fuelStore';
import { useTripsStore } from '../store/tripsStore';
import { useMoneyStore } from '../store/moneyStore';
import { useWorkdayStore } from '../store/workdayStore';
import { useThemeStore } from '../store/themeStore';

export const BACKUP_VERSION = 1;

export interface BackupFile {
  app: 'fodi';
  version: number;
  exportedAt: number;
  lockTimeoutMs: number;
  data: BackupData;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function nullableStr(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function nullableNum(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

/** Rassemble toutes les données locales en un objet de sauvegarde. */
export async function collectBackup(): Promise<BackupFile> {
  const [fills, trips, costCats, incomeCats, recurrings] = await Promise.all([
    listFills(),
    listTrips(),
    listCategories('cost'),
    listCategories('income'),
    listRecurrings(),
  ]);
  const [expenses, incomes, workdays, allSettings, lockTimeoutMs] = await Promise.all([
    listExpenses(0, Number.MAX_SAFE_INTEGER),
    listIncomes(0, Number.MAX_SAFE_INTEGER),
    listWorkdays('0000-00-00', '9999-99-99'),
    getAllSettings(),
    getLockTimeoutMs(),
  ]);
  const settings = allSettings.filter((s) =>
    (BACKUP_SETTING_KEYS as readonly string[]).includes(s.key),
  );
  return {
    app: 'fodi',
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    lockTimeoutMs,
    data: {
      fills,
      trips,
      categories: [...costCats, ...incomeCats],
      expenses,
      incomes,
      recurrings,
      workdays,
      settings,
    },
  };
}

/** Valide et normalise un JSON de sauvegarde (lève une erreur si invalide). */
export function parseBackup(json: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error('Fichier illisible : JSON invalide.');
  }
  if (typeof raw !== 'object' || raw === null) throw new Error('Sauvegarde invalide.');
  const r = raw as Record<string, unknown>;
  if (r.app !== 'fodi') throw new Error('Ce fichier n’est pas une sauvegarde Fodi.');
  if (r.version !== BACKUP_VERSION) throw new Error('Version de sauvegarde non prise en charge.');
  const d = r.data as Record<string, unknown> | undefined;
  if (!d || typeof d !== 'object') throw new Error('Sauvegarde invalide : données manquantes.');

  const fills: FillRow[] = asArray(d.fills).map((f) => ({
    id: num(f.id),
    ts: num(f.ts),
    station: nullableStr(f.station),
    volumeL: num(f.volumeL),
    pricePerLitre: num(f.pricePerLitre),
    feeFBu: num(f.feeFBu),
    odoKm: nullableNum(f.odoKm),
    litresBeforeL: num(f.litresBeforeL),
    litresAfterL: num(f.litresAfterL),
  }));
  const trips: TripRow[] = asArray(d.trips).map((t) => ({
    id: num(t.id),
    ts: num(t.ts),
    fromPlace: nullableStr(t.fromPlace),
    toPlace: str(t.toPlace),
    km: num(t.km),
    fare: num(t.fare),
    extras: num(t.extras),
    odoFromKm: nullableNum(t.odoFromKm),
    odoToKm: nullableNum(t.odoToKm),
    fuelL: nullableNum(t.fuelL),
    note: nullableStr(t.note),
  }));
  if (trips.some((t) => !t.toPlace)) {
    throw new Error('Sauvegarde invalide : trajets sans destination.');
  }
  const categories: CategoryRow[] = asArray(d.categories)
    .filter((c) => typeof c.id === 'string' && (c.kind === 'cost' || c.kind === 'income'))
    .map((c) => ({ id: c.id as string, kind: c.kind as 'cost' | 'income', label: str(c.label) }));
  const expenses: ExpenseRow[] = asArray(d.expenses).map((e) => ({
    id: num(e.id),
    ts: num(e.ts),
    categoryId: str(e.categoryId),
    amount: num(e.amount),
    vendor: nullableStr(e.vendor),
    note: nullableStr(e.note),
  }));
  const incomes: IncomeRow[] = asArray(d.incomes).map((i) => ({
    id: num(i.id),
    ts: num(i.ts),
    categoryId: str(i.categoryId),
    amount: num(i.amount),
    note: nullableStr(i.note),
  }));
  const recurrings: RecurringRow[] = asArray(d.recurrings).map((x) => ({
    id: num(x.id),
    label: str(x.label),
    amount: num(x.amount),
    cadence: x.cadence === 'weekly' ? 'weekly' : 'monthly',
    nextDue: num(x.nextDue),
    categoryId: str(x.categoryId),
    active: num(x.active, 1),
  }));
  const workdays: WorkdayRow[] = asArray(d.workdays)
    .filter((w) => typeof w.day === 'string')
    .map((w) => ({
      day: w.day as string,
      odoStart: nullableNum(w.odoStart),
      odoEnd: nullableNum(w.odoEnd),
      startedTs: nullableNum(w.startedTs),
      endedTs: nullableNum(w.endedTs),
      fuelStartL: nullableNum(w.fuelStartL),
      fuelEndL: nullableNum(w.fuelEndL),
    }));
  const settings = asArray(d.settings)
    .filter((s) => typeof s.key === 'string' && typeof s.value === 'string')
    .map((s) => ({ key: s.key as string, value: s.value as string }));

  return {
    app: 'fodi',
    version: BACKUP_VERSION,
    exportedAt: num(r.exportedAt, Date.now()),
    lockTimeoutMs: num(r.lockTimeoutMs, 5 * 60 * 1000),
    data: { fills, trips, categories, expenses, incomes, recurrings, workdays, settings },
  };
}

/** Résumé lisible d'une sauvegarde (écran de confirmation). */export function summarizeBackup(b: BackupFile): { label: string; count: number }[] {
  return [
    { label: 'Pleins', count: b.data.fills.length },
    { label: 'Trajets', count: b.data.trips.length },
    { label: 'Dépenses', count: b.data.expenses.length },
    { label: 'Revenus', count: b.data.incomes.length },
    { label: 'Règles', count: b.data.recurrings.length },
    { label: 'Jours', count: b.data.workdays.length },
  ];
}

function backupFileName(exportedAt: number): string {
  const d = new Date(exportedAt);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
  return `fodi-backup-${day}.json`;
}

/** Écrit la sauvegarde dans Documents et ouvre le partage. Retourne le nom du fichier. */
export async function exportBackupFile(): Promise<string> {
  const backup = await collectBackup();
  const name = backupFileName(backup.exportedAt);
  const file = new File(Paths.document, name);
  const writer = file.writableStream().getWriter();
  await writer.write(new TextEncoder().encode(JSON.stringify(backup)));
  await writer.close();
  await shareAsync(file.uri);
  return name;
}

/**
 * Ouvre le sélecteur de fichier et lit le JSON choisi.
 * Utilise le picker natif de expo-file-system (le fichier rendu reste lisible
 * sans permission stockage) + replis si la lecture directe échoue.
 */
export async function pickBackupJson(): Promise<{ json: string; name: string } | null> {
  const picked = await File.pickFileAsync({
    mimeTypes: ['application/json', 'text/plain', 'application/octet-stream'],
  });
  if (picked.canceled || !picked.result) return null;
  const file = picked.result;
  try {
    return { json: await file.text(), name: file.name };
  } catch {
    // Repli 1 : API classique (résout les content:// via le ContentResolver).
    try {
      const { readAsStringAsync } = await import('expo-file-system/legacy');
      return { json: await readAsStringAsync(file.uri), name: file.name };
    } catch {
      // Repli 2 : lecture via fetch (gère aussi les content:// sur Android).
      const res = await fetch(file.uri);
      if (!res.ok) throw new Error(`Lecture impossible (HTTP ${res.status}).`);
      return { json: await res.text(), name: file.name };
    }
  }
}

/** Applique une sauvegarde validée : remplace tout + recharge les écrans. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await importDatabase(backup.data);
  try {
    await setLockTimeoutMs(backup.lockTimeoutMs);
    setCurrentTimeout(backup.lockTimeoutMs);
  } catch {
    // Délai hors bornes dans un vieux fichier : on garde le réglage actuel.
  }
  await Promise.all([
    useFuelStore.getState().load(),
    useTripsStore.getState().load(),
    useMoneyStore.getState().load(),
    useWorkdayStore.getState().load(),
    useThemeStore.getState().loadAccent(),
  ]);
}
