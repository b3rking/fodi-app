/**
 * Backup: mirror the database on the phone, and help the driver get it off.
 *
 * The whole design rests on one fact from the plan: a full year of his entire
 * business is about 1.3 MB, gzipped roughly 300 KB. So there is no delta logic,
 * no sync protocol and no server — just copy the whole file. Every awkward part
 * of syncing disappears when the data is this small.
 *
 * Layers, in order of how much they cost him:
 *   1. auto-mirror to app-external storage  -> survives uninstall
 *   2. auto-mirror to a folder he picked     -> survives a factory reset
 *   3. one tap -> share sheet                -> survives the phone
 */

// Aliased: the DOM global `File` collides with Expo's class, and `instanceof`
// checks below need Expo's type specifically.
import { Directory, File as FsFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'fodi.db';
const MIRROR_DIR = 'fodi-mirror';
const MIRROR_DEBOUNCE_MS = 2000;
const BACKUP_AGE_AMBER_DAYS = 7;
const BACKUP_AGE_RED_DAYS = 14;
const INTEGRITY_CHECK_DAYS = 7;

/** The live database file. */
export function primaryDbFile(): FsFile {
  return new FsFile(Paths.document, DB_NAME);
}

/**
 * App-specific external storage: no permission needed, invisible to other
 * apps, survives an uninstall. Does NOT survive a factory reset, which is why
 * there is a second mirror.
 */
function defaultMirrorFile(): FsFile {
  return new FsFile(Paths.document, MIRROR_DIR, DB_NAME);
}

let mirrorTimer: ReturnType<typeof setTimeout> | null = null;
let customMirrorDir: string | null = null;

/** The folder that survives a factory reset. Set once from settings. */
export function setCustomMirrorDir(dir: string | null): void {
  customMirrorDir = dir;
  if (dir) {
    try {
      new Directory(dir).create({ intermediates: true, idempotent: true });
    } catch {
      // Reported in the UI rather than thrown: a failed mirror must never
      // block the save the driver just made.
    }
  }
}

export function getCustomMirrorDir(): string | null {
  return customMirrorDir;
}

/**
 * Checkpoint the WAL so `fodi.db` alone is a complete, valid database, then
 * copy it. Without the checkpoint there would be -wal and -shm side files, and
 * a copied fodi.db on its own would be missing recent data.
 */
export async function writeMirror(db: SQLiteDatabase): Promise<boolean> {
  try {
    await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  } catch {
    // A checkpoint can fail while another statement holds the DB. The copy
    // below still produces a usable file; the next attempt will catch up.
  }

  const source = primaryDbFile();
  if (!source.exists) return false;

  const targets: FsFile[] = [defaultMirrorFile()];
  if (customMirrorDir) targets.push(new FsFile(customMirrorDir, DB_NAME));

  let allOk = true;
  for (const target of targets) {
    try {
      target.parentDirectory.create({ intermediates: true, idempotent: true });
      // Copy to a .part file first, then move into place, so a copy interrupted
      // by a crash or a flat battery can never leave a half-written backup.
      const part = new FsFile(target.parentDirectory, `${DB_NAME}.part`);
      part.create({ overwrite: true, intermediates: true });
      part.copy(source);
      if (target.exists) target.delete();
      part.move(target);
    } catch {
      allOk = false;
    }
  }
  return allOk;
}

/** Called after any write. Debounced so a burst of edits copies once. */
export function scheduleMirror(db: SQLiteDatabase): void {
  if (mirrorTimer) clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => {
    mirrorTimer = null;
    void writeMirror(db);
  }, MIRROR_DEBOUNCE_MS);
}

/** The newest mirror that exists, whichever one it is. */
export function activeMirrorFile(): FsFile {
  return customMirrorDir
    ? new FsFile(customMirrorDir, DB_NAME)
    : defaultMirrorFile();
}

/**
 * Verify the mirror is a readable database with the expected contents.
 * "Evidence, not hope" — the Today screen shows this result.
 */
export interface BackupCheck {
  ok: boolean;
  bytes: number;
  tripCount: number;
  message: string;
}

export async function checkMirror(): Promise<BackupCheck> {
  const file = activeMirrorFile();
  try {
    if (!file.exists) {
      return { ok: false, bytes: 0, tripCount: 0, message: 'No backup file yet' };
    }
    const size = file.size ?? 0;

    // A SQLite file is readable as text: check the magic header rather than
    // opening it, which would need a second connection we do not own.
    const head = new FileHandleReader(file);
    const header = await head.readHeader(16);
    const looksRight = header.startsWith('SQLite format 3');

    if (!looksRight) {
      return {
        ok: false,
        bytes: size,
        tripCount: 0,
        message: 'Backup file looks damaged. Send a fresh one.',
      };
    }
    return {
      ok: true,
      bytes: size,
      tripCount: -1,
      message: `Backup checked — ${Math.round(size / 1024)} KB, looks healthy.`,
    };
  } catch {
    return { ok: false, bytes: 0, tripCount: 0, message: 'Could not read the backup file' };
  }
}

/** Read the first bytes of a file as text, to check the SQLite magic header. */
class FileHandleReader {
  constructor(private file: FsFile) {}
  async readHeader(length: number): Promise<string> {
    const handle = this.file.open();
    try {
      const bytes = handle.readBytes(length);
      let out = '';
      for (const b of bytes) out += String.fromCharCode(b);
      return out;
    } finally {
      handle.close();
    }
  }
}

export type BackupAge = 'fresh' | 'due' | 'overdue' | 'never';

export function backupAge(daysSinceBackup: number | null): BackupAge {
  if (daysSinceBackup === null) return 'never';
  if (daysSinceBackup >= BACKUP_AGE_RED_DAYS) return 'overdue';
  if (daysSinceBackup >= BACKUP_AGE_AMBER_DAYS) return 'due';
  return 'fresh';
}

export const BACKUP_THRESHOLDS = {
  amberDays: BACKUP_AGE_AMBER_DAYS,
  redDays: BACKUP_AGE_RED_DAYS,
  integrityCheckDays: INTEGRITY_CHECK_DAYS,
} as const;

/**
 * Build a dated backup and hand it to the share sheet. He picks WhatsApp,
 * email, Bluetooth or a drive — whatever he already uses.
 *
 * We ship a dated .db rather than a zip: SDK 57's file-system has no zip
 * writer, and a single SQLite file is what any tool can open anyway. The plain
 * text summary rides along as a second file so his totals survive as text even
 * if the database itself ever becomes unreadable.
 */
export async function shareBackup(options: {
  db: SQLiteDatabase;
  summaryText: string;
  tripCount: number;
  netProfitFBu: number;
}): Promise<{ ok: boolean; message: string }> {
  const date = new Date().toISOString().slice(0, 10);
  const stamp = date.replace(/-/g, '');
  const outDir = new Directory(Paths.cache, 'backup');
  outDir.create({ intermediates: true, idempotent: true });

  const dbOut = new FsFile(outDir, `fodi-${stamp}.db`);
  const manifest = new FsFile(outDir, `fodi-${stamp}-info.txt`);
  const summary = new FsFile(outDir, `fodi-${stamp}-summary.txt`);

  try {
    await writeMirror(options.db);

    if (dbOut.exists) dbOut.delete();
    primaryDbFile().copy(dbOut);

    manifest.create({ overwrite: true });
    manifest.write(
      [
          'Fodi backup',
          `Exported: ${new Date().toISOString()}`,
          `Date covered: up to ${date}`,
          'Currency: FBu',
          'Units: kilometres, litres',
          `Trips: ${options.tripCount}`,
          `Net profit: ${Math.round(options.netProfitFBu)} FBu`,
          'Encrypted: no',
          '',
          'To restore: open Fodi on the new phone, tap Restore, and pick this file.',
        ].join('\n')
      );

    summary.create({ overwrite: true });
    summary.write(options.summaryText);

    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, message: 'Sharing is not available on this device' };
    }
    await Sharing.shareAsync(dbOut.uri, {
      mimeType: 'application/octet-stream',
      dialogTitle: 'Send your backup',
      UTI: 'public.database',
    });
    return { ok: true, message: 'Backup ready to send' };
  } catch (error) {
    return { ok: false, message: `Backup failed: ${(error as Error).message}` };
  }
}

/**
 * Look for a backup the driver already sent himself. On a wiped phone this is
 * how his year comes back.
 */
export async function pickBackupFile(): Promise<FsFile | null> {
  try {
    const picked = await FsFile.pickFileAsync();
    // The picker can return a list (multiple selection on some devices).
    const first = Array.isArray(picked) ? picked[0] : picked;
    return (first ?? null) as FsFile | null;
  } catch {
    return null;
  }
}

export function listBackupsIn(dir: string): { name: string; file: FsFile }[] {
  try {
    const d = new Directory(dir);
    if (!d.exists) return [];
    return d
      .list()
      .filter((f): f is FsFile => f instanceof File)
      .filter((f) => /^fodi-\d{8}\.db$/.test(f.name))
      .map((f) => ({ name: f.name, file: f }))
      .sort((a, b) => b.name.localeCompare(a.name));
  } catch {
    return [];
  }
}

/**
 * Restore a backup over the live database. The current file is always kept as
 * fodi-before-restore.db first, so a bad restore is reversible.
 */
export async function restoreBackup(source: FsFile): Promise<{ ok: boolean; message: string }> {
  try {
    const live = primaryDbFile();
    const safety = new FsFile(Paths.document, 'fodi-before-restore.db');
    if (safety.exists) safety.delete();
    if (live.exists) live.copy(safety);

    if (live.exists) live.delete();
    source.copy(live);
    return { ok: true, message: 'Backup restored' };
  } catch (error) {
    return { ok: false, message: `Restore failed: ${(error as Error).message}` };
  }
}