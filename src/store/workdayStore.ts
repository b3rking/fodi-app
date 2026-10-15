import { create } from 'zustand';
import {
  closeWorkday as dbCloseWorkday,
  getWorkday as dbGetWorkday,
  listWorkdays as dbListWorkdays,
  openWorkday as dbOpenWorkday,
  type WorkdayRow,
} from '../db/database';

export function todayKeyLocal(now = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface WorkdayState {
  ready: boolean;
  /** Journée calendaire du jour. */
  today: WorkdayRow | null;
  /** Sept derniers jours calendaires (dont aujourd'hui). */
  week: WorkdayRow[];
  load: () => Promise<void>;
  openDay: (odoStart: number, fuelL: number | null) => Promise<void>;
  closeDay: (odoEnd: number, fuelL: number | null) => Promise<void>;
}

async function reload(): Promise<{ today: WorkdayRow | null; week: WorkdayRow[] }> {
  const todayKey = todayKeyLocal();
  const weekAgo = new Date(Date.now() - 6 * 86400000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fromKey = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;
  const [today, week] = await Promise.all([
    dbGetWorkday(todayKey),
    dbListWorkdays(fromKey, todayKey),
  ]);
  return { today, week };
}

export const useWorkdayStore = create<WorkdayState>((set) => ({
  ready: false,
  today: null,
  week: [],

  load: async () => {
    set({ ready: true, ...(await reload()) });
  },

  openDay: async (odoStart, fuelL) => {
    if (!Number.isFinite(odoStart) || odoStart < 0) {
      throw new Error('Compteur de départ invalide.');
    }
    if (fuelL != null && (!Number.isFinite(fuelL) || fuelL < 0)) {
      throw new Error('Niveau de carburant invalide.');
    }
    await dbOpenWorkday(todayKeyLocal(), odoStart, fuelL);
    set(await reload());
  },

  closeDay: async (odoEnd, fuelL) => {
    if (!Number.isFinite(odoEnd) || odoEnd < 0) {
      throw new Error('Compteur de retour invalide.');
    }
    if (fuelL != null && (!Number.isFinite(fuelL) || fuelL < 0)) {
      throw new Error('Niveau de carburant invalide.');
    }
    await dbCloseWorkday(todayKeyLocal(), odoEnd, fuelL);
    set(await reload());
  },
}));
