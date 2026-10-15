import { describe, expect, it } from 'vitest';
import { allocateFuel, windowForTs, type BurnWindow } from './allocate';

const windows: BurnWindow[] = [
  { startTs: null, endTs: 2000, consumedL: 10, costFBu: 38000 },
  { startTs: 2000, endTs: 3000, consumedL: 5, costFBu: 20000 },
];

describe('windowForTs', () => {
  it('trouve la fenêtre contenant le trajet', () => {
    expect(windowForTs(windows, 1500)).toBe(windows[0]);
    expect(windowForTs(windows, 2000)).toBe(windows[0]);
    expect(windowForTs(windows, 2500)).toBe(windows[1]);
  });

  it('trajet après la dernière fenêtre → aucune', () => {
    expect(windowForTs(windows, 9999)).toBeNull();
  });
});

describe('allocateFuel', () => {
  it('partage au prorata des km dans la fenêtre', () => {
    const shares = allocateFuel(windows, [
      { id: 1, ts: 1000, km: 30 },
      { id: 2, ts: 1500, km: 10 },
      { id: 3, ts: 2500, km: 5 },
    ]);
    // Fenêtre 1 : 10 L pour 40 km → 7,5 L et 2,5 L
    expect(shares[0].fuelL).toBeCloseTo(7.5, 10);
    expect(shares[0].fuelCostFBu).toBeCloseTo(28500, 10);
    expect(shares[1].fuelL).toBeCloseTo(2.5, 10);
    // Fenêtre 2 : 5 L pour 5 km → tout au trajet 3
    expect(shares[2].fuelL).toBeCloseTo(5, 10);
    expect(shares[2].fuelCostFBu).toBeCloseTo(20000, 10);
  });

  it('km nuls ou trajets hors fenêtre → pas de partage', () => {
    const shares = allocateFuel(windows, [
      { id: 1, ts: 1000, km: 0 },
      { id: 2, ts: 9999, km: 10 },
    ]);
    expect(shares[0].fuelL).toBeNull();
    expect(shares[0].fuelCostFBu).toBeNull();
    expect(shares[1].fuelL).toBeNull();
  });

  it('listes vides → rien', () => {
    expect(allocateFuel([], [{ id: 1, ts: 1000, km: 10 }])).toEqual([
      { tripId: 1, fuelL: null, fuelCostFBu: null },
    ]);
    expect(allocateFuel(windows, [])).toEqual([]);
  });
});
