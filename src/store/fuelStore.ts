import { create } from 'zustand';
import {
  deleteFill as dbDeleteFill,
  getTankCapL,
  initDatabase,
  insertFill as dbInsertFill,
  listFills,
  setTankCapL as dbSetTankCapL,
  type FillRow,
} from '../db/database';

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
  /** Litres relevés après le dernier plein (0 si aucun). */
  lastLitresAfterL: number;
  /** Dernier compteur connu (pour pré-remplir). */
  lastOdoKm: number | null;
  load: () => Promise<void>;
  addFill: (input: NewFillInput) => Promise<FillRow>;
  /** Supprime et renvoie la copie pour annulation, `null` si introuvable. */
  removeFill: (id: number) => Promise<Omit<FillRow, 'id'> | null>;
  /** Réinsère une copie (annulation de suppression). */
  restoreFill: (snapshot: Omit<FillRow, 'id'>) => Promise<void>;
  setCapL: (capL: number) => Promise<void>;
}

function derive(fills: FillRow[]) {
  const last = fills[fills.length - 1];
  return {
    lastLitresAfterL: last ? last.litresAfterL : 0,
    lastOdoKm: [...fills].reverse().find((f) => f.odoKm != null)?.odoKm ?? null,
  };
}

export const useFuelStore = create<FuelState>((set, get) => ({
  ready: false,
  capL: 60,
  fills: [],
  lastLitresAfterL: 0,
  lastOdoKm: null,

  load: async () => {
    await initDatabase();
    const [capL, fills] = await Promise.all([getTankCapL(), listFills()]);
    set({ ready: true, capL, fills, ...derive(fills) });
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
}));
