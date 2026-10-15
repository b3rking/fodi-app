import { create } from 'zustand';
import {
  deleteTrip as dbDeleteTrip,
  initDatabase,
  insertTrip as dbInsertTrip,
  listTrips,
  updateTrip as dbUpdateTrip,
  type NewTrip,
  type TripRow,
} from '../db/database';

interface TripsState {
  ready: boolean;
  trips: TripRow[];
  /** Dix dernières destinations distinctes (chips de la fiche). */
  recentPlaces: string[];
  /** Dernier compteur connu côté trajets. */
  lastOdoKm: number | null;
  load: () => Promise<void>;
  addTrip: (input: NewTrip) => Promise<TripRow>;
  editTrip: (id: number, input: NewTrip) => Promise<void>;
  removeTrip: (id: number) => Promise<Omit<TripRow, 'id'> | null>;
  restoreTrip: (snapshot: Omit<TripRow, 'id'>) => Promise<void>;
  /** Dernier kilométrage connu vers une destination (pré-remplissage). */
  lastKmTo: (toPlace: string) => number | null;
}

function derive(trips: TripRow[]) {
  const places: string[] = [];
  for (const t of [...trips].reverse()) {
    if (t.toPlace && !places.includes(t.toPlace)) {
      places.push(t.toPlace);
      if (places.length >= 10) break;
    }
  }
  const odos = trips.flatMap((t) => [t.odoFromKm, t.odoToKm]).filter(
    (v): v is number => v != null,
  );
  return {
    recentPlaces: places,
    lastOdoKm: odos.length > 0 ? Math.max(...odos) : null,
  };
}

export const useTripsStore = create<TripsState>((set, get) => ({
  ready: false,
  trips: [],
  recentPlaces: [],
  lastOdoKm: null,

  load: async () => {
    await initDatabase();
    const trips = await listTrips();
    set({ ready: true, trips, ...derive(trips) });
  },

  addTrip: async (input) => {
    const created = await dbInsertTrip(input);
    const trips = await listTrips();
    set({ trips, ...derive(trips) });
    return created;
  },

  editTrip: async (id, input) => {
    await dbUpdateTrip(id, input);
    const trips = await listTrips();
    set({ trips, ...derive(trips) });
  },

  removeTrip: async (id) => {
    const snapshot = get().trips.find((t) => t.id === id) ?? null;
    if (!snapshot) return null;
    await dbDeleteTrip(id);
    const trips = await listTrips();
    set({ trips, ...derive(trips) });
    const { id: _dropped, ...rest } = snapshot;
    void _dropped;
    return rest;
  },

  restoreTrip: async (snapshot) => {
    await dbInsertTrip(snapshot);
    const trips = await listTrips();
    set({ trips, ...derive(trips) });
  },

  lastKmTo: (toPlace) => {
    const found = [...get().trips]
      .reverse()
      .find((t) => t.toPlace.toLowerCase() === toPlace.trim().toLowerCase());
    return found ? found.km : null;
  },
}));
