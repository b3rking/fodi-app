import { describe, expect, it } from 'vitest';
import { allocateFuel, estimateTripFuel } from './allocate';

describe('allocateFuel', () => {
  it('splits a burn across trips by kilometres', () => {
    const shares = allocateFuel({
      trips: [
        { id: '1', km: 10, startTs: '', manualFuelL: null },
        { id: '2', km: 30, startTs: '', manualFuelL: null },
      ],
      litresBurned: 8,
      costBurned: 30400,
    });

    // 10 km of 40 total = a quarter of the fuel
    expect(shares[0].fuelL).toBeCloseTo(2, 9);
    expect(shares[0].cost).toBeCloseTo(7600, 6);
    expect(shares[1].fuelL).toBeCloseTo(6, 9);
    expect(shares[1].cost).toBeCloseTo(22800, 6);
  });

  it('always allocates exactly what burned', () => {
    const shares = allocateFuel({
      trips: [
        { id: '1', km: 7.3, startTs: '', manualFuelL: null },
        { id: '2', km: 4.1, startTs: '', manualFuelL: null },
        { id: '3', km: 12.9, startTs: '', manualFuelL: null },
      ],
      litresBurned: 5.7,
      costBurned: 21660,
    });
    const total = shares.reduce((s, x) => s + x.fuelL, 0);
    expect(total).toBeCloseTo(5.7, 9);
  });

  it('lets a manual entry win and shares only what is left', () => {
    const shares = allocateFuel({
      trips: [
        { id: '1', km: 10, startTs: '', manualFuelL: 3 },
        { id: '2', km: 30, startTs: '', manualFuelL: null },
      ],
      litresBurned: 8,
      costBurned: 30400,
    });

    const manual = shares.find((s) => s.id === '1')!;
    const auto = shares.find((s) => s.id === '2')!;

    expect(manual.manual).toBe(true);
    expect(manual.fuelL).toBeCloseTo(3, 9);
    // 3/8 of 30 400 at the window price of 3 800/L
    expect(manual.cost).toBeCloseTo(3 * 3800, 6);
    expect(auto.fuelL).toBeCloseTo(5, 9);
    expect(auto.cost).toBeCloseTo(30400 - 11400, 6);
  });

  it('does not go negative when manual entries exceed the burn', () => {
    const shares = allocateFuel({
      trips: [{ id: '1', km: 10, startTs: '', manualFuelL: 50 }],
      litresBurned: 8,
      costBurned: 30400,
    });
    expect(shares[0].fuelL).toBeCloseTo(50, 9);
    expect(shares[0].cost).toBeGreaterThan(0);
  });

  it('gives an auto trip nothing when a manual entry used it all', () => {
    const shares = allocateFuel({
      trips: [
        { id: '1', km: 10, startTs: '', manualFuelL: 8 },
        { id: '2', km: 30, startTs: '', manualFuelL: null },
      ],
      litresBurned: 8,
      costBurned: 30400,
    });
    expect(shares.find((s) => s.id === '2')!.fuelL).toBe(0);
  });

  it('survives zero kilometres across every trip', () => {
    const shares = allocateFuel({
      trips: [{ id: '1', km: 0, startTs: '', manualFuelL: null }],
      litresBurned: 4,
      costBurned: 15200,
    });
    expect(Number.isFinite(shares[0].fuelL)).toBe(true);
    expect(shares[0].fuelL).toBe(0);
  });

  it('survives a negative km from bad data without going negative', () => {
    const shares = allocateFuel({
      trips: [
        { id: '1', km: -5, startTs: '', manualFuelL: null },
        { id: '2', km: 10, startTs: '', manualFuelL: null },
      ],
      litresBurned: 4,
      costBurned: 15200,
    });
    expect(shares[0].fuelL).toBeGreaterThanOrEqual(0);
    expect(shares[1].fuelL).toBeGreaterThan(0);
  });

  it('returns nothing for an empty window', () => {
    expect(allocateFuel({ trips: [], litresBurned: 5, costBurned: 19000 })).toEqual([]);
  });

  it('returns zero shares when nothing burned', () => {
    const shares = allocateFuel({
      trips: [{ id: '1', km: 10, startTs: '', manualFuelL: null }],
      litresBurned: 0,
      costBurned: 0,
    });
    expect(shares[0].fuelL).toBe(0);
    expect(shares[0].cost).toBe(0);
  });

  it('prices manual litres at the window average', () => {
    const shares = allocateFuel({
      trips: [{ id: '1', km: 10, startTs: '', manualFuelL: 2 }],
      litresBurned: 4,
      costBurned: 15600, // 3 900/L
    });
    expect(shares[0].cost).toBeCloseTo(7800, 6);
  });
});

describe('estimateTripFuel', () => {
  it('previews the fuel cost of a trip before it is saved', () => {
    const r = estimateTripFuel(18, 10.8, 3800);
    expect(r.litres).toBeCloseTo(1.667, 3);
    expect(r.cost).toBeCloseTo(6333, 0);
  });

  it('gives nothing when we do not know his economy yet', () => {
    expect(estimateTripFuel(18, null, 3800)).toEqual({ litres: null, cost: null });
    expect(estimateTripFuel(18, 10.8, null)).toEqual({ litres: null, cost: null });
  });

  it('refuses a zero or negative distance', () => {
    expect(estimateTripFuel(0, 10.8, 3800).litres).toBeNull();
    expect(estimateTripFuel(-4, 10.8, 3800).litres).toBeNull();
  });

  it('refuses a nonsensical economy instead of dividing by it', () => {
    expect(estimateTripFuel(18, 0, 3800).litres).toBeNull();
    expect(estimateTripFuel(18, -5, 3800).litres).toBeNull();
  });
});