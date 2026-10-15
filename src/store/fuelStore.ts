import { create } from 'zustand';
import {
  deleteFill as dbDeleteFill,
  getFuelGauge as dbGetFuelGauge,
  getLevelFormat as dbGetLevelFormat,
  getTankCapL,
  getTankLevels as dbGetTankLevels,
  initDatabase,
  insertFill as dbInsertFill,
  listFills,
  setFuelGauge as dbSetFuelGauge,
  setLevelFormat as dbSetLevelFormat,
  setTankCapL as dbSetTankCapL,
  setTankLevels as dbSetTankLevels,
  type FillRow,
  type FuelGaugeStyle,
} from '../db/database';
import { DEFAULT_TANK_LEVELS, type LevelLabelStyle, type TankLevelDef } from '../core/fuel/engine';

export interface NewFillInput {
  station: string | null;
  volumeL: number;
  pricePerLitre: number;
  odoKm: number | null;
  litresBeforeL: number;
  litresAfterL: number;
}

interface FuelState {
  ready: boolean;
  capL: number;
  fills: FillRow[];
  levels: TankLevelDef[];
  gauge: FuelGaugeStyle;
  levelFormat: LevelLabelStyle;
  /** Dernier compteur connu (pour pré-remplir). */
  lastOdoKm: number | null;
  load: () => Promise<void>;
  addFill: (input: NewFillInput) => Promise<FillRow>;
  /** Supprime et renvoie la copie pour annulation, `null` si introuvable. */
  removeFill: (id: number) => Promise<Omit<FillRow, 'id'> | null>;
  /** Réinsère une copie (annulation de suppression). */
  restoreFill: (snapshot: Omit<FillRow, 'id'>) => Promise<void>;
  setCapL: (capL: number) => Promise<void>;
  setLevels: (levels: TankLevelDef[]) => Promise<void>;
  setGauge: (gauge: FuelGaugeStyle) => Promise<void>;
  setLevelFormat: (style: LevelLabelStyle) => Promise<void>;
}

function derive(fills: FillRow[]) {
  return {
    lastOdoKm: [...fills].reverse().find((f) => f.odoKm != null)?.odoKm ?? null,
  };
}

export const useFuelStore = create<FuelState>((set, get) => ({
  ready: false,
  capL: 60,
  fills: [],
  levels: DEFAULT_TANK_LEVELS,
  gauge: 'bars',
  levelFormat: 'fractions',
  lastOdoKm: null,

  load: async () => {
    await initDatabase();
    const [capL, fills, levels, gauge, levelFormat] = await Promise.all([
      getTankCapL(),
      listFills(),
      dbGetTankLevels(),
      dbGetFuelGauge(),
      dbGetLevelFormat(),
    ]);
    set({ ready: true, capL, fills, levels, gauge, levelFormat, ...derive(fills) });
  },

  addFill: async (input) => {
    const created = await dbInsertFill({ ...input, feeFBu: 0 });
    const fills = await listFills();
    set({ fills, ...derive(fills) });
    return created;
  },

  removeFill: async (id) => {
    const snapshot = get().fills.find((f) => f.id === id) ?? null;
    if (!snapshot) return null;
    await dbDeleteFill(id);
    const fills = await listFills();
    set({ fills, ...derive(fills) });
    const { id: _dropped, ...rest } = snapshot;
    void _dropped;
    return rest;
  },

  restoreFill: async (snapshot) => {
    await dbInsertFill({ ...snapshot, feeFBu: snapshot.feeFBu ?? 0 });
    const fills = await listFills();
    set({ fills, ...derive(fills) });
  },

  setCapL: async (capL) => {
    if (!Number.isFinite(capL) || capL < 5 || capL > 500) {
      throw new Error('La capacité doit être entre 5 et 500 litres.');
    }
    await dbSetTankCapL(capL);
    set({ capL });
  },

  setLevels: async (levels) => {
    const sorted = [...levels].sort((a, b) => a.fraction - b.fraction);
    await dbSetTankLevels(sorted);
    set({ levels: sorted });
  },

  setGauge: async (gauge) => {
    await dbSetFuelGauge(gauge);
    set({ gauge });
  },

  setLevelFormat: async (style) => {
    await dbSetLevelFormat(style);
    set({ levelFormat: style });
  },
}));
