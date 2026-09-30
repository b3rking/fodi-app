import { describe, expect, it } from 'vitest';
import {
  blendedPrice,
  consume,
  efficiency,
  emptyTank,
  FILL_LEVEL_FRACTION,
  headroomL,
  isConsistent,
  isOverfill,
  isAtReserve,
  kmLeftInTank,
  lastKnownPrice,
  levelToLitres,
  litresBurnedBetween,
  maxFillableL,
  refill,
  setLevel,
  unrecoveredFuelMoney,
} from './engine';

const CAP = 60;

function tankWithFbu() {
  // The exact case from the plan: 2 L, then +6 L, then a partial burn, then fill.
  let t = emptyTank(CAP, 5);
  t = refill(t, { id: 'a', volumeL: 2, pricePerLitre: 3600, boughtAt: '2026-09-01T08:00:00Z' }).tank;
  t = refill(t, { id: 'b', volumeL: 6, pricePerLitre: 3900, boughtAt: '2026-09-05T08:00:00Z' }).tank;
  return t;
}

describe('blendedPrice', () => {
  it('is the weighted mix, not the last price paid', () => {
    const t = tankWithFbu();
    // (2*3600 + 6*3900) / 8 = 30600 / 8 = 3825
    expect(blendedPrice(t)).toBeCloseTo(3825, 6);
  });

  it('is null on an empty tank, because the question has no answer', () => {
    expect(blendedPrice(emptyTank(CAP))).toBeNull();
  });

  it('rises to the expensive price once the cheap fuel is gone', () => {
    let t = tankWithFbu();
    const before = blendedPrice(t) as number;
    t = consume(t, 5).tank;
    const after = blendedPrice(t) as number;
    expect(after).toBeCloseTo(3900, 6);
    expect(after).toBeGreaterThan(before);
  });
});

describe('refill', () => {
  it('splits a purchase into its own layer', () => {
    const t = tankWithFbu();
    expect(t.layers).toHaveLength(2);
    expect(t.layers[0]).toMatchObject({ id: 'a', litres: 2, pricePerLitre: 3600 });
    expect(t.layers[1]).toMatchObject({ id: 'b', litres: 6, pricePerLitre: 3900 });
  });

  it('adds volume and cost together', () => {
    const t = tankWithFbu();
    expect(t.litres).toBeCloseTo(8, 9);
    expect(t.cost).toBeCloseTo(30600, 6);
  });

  it('spreads a convenience fee into the effective price per litre', () => {
    const { tank } = refill(emptyTank(CAP), {
      id: 'f',
      volumeL: 10,
      pricePerLitre: 3800,
      fee: 2000,
      boughtAt: '2026-09-01T08:00:00Z',
    });
    // 10*3800 + 2000 = 40000 over 10 L = 4000/L
    expect(tank.cost).toBeCloseTo(40000, 6);
    expect(blendedPrice(tank)).toBeCloseTo(4000, 6);
  });

  it('flags an overfill instead of silently clamping', () => {
    const r = refill(emptyTank(10), {
      id: 'x',
      volumeL: 12,
      pricePerLitre: 3800,
      boughtAt: '2026-09-01T08:00:00Z',
    });
    expect(r.overfilled).toBe(true);
    expect(r.tank.litres).toBeCloseTo(12, 9); // kept, not clamped
    expect(isOverfill(12, emptyTank(10))).toBe(true);
  });

  it('reports how much room is left, for the "you can only add N" warning', () => {
    const t = tankWithFbu();
    expect(headroomL(t)).toBeCloseTo(52, 9);
    expect(maxFillableL(t)).toBeCloseTo(52, 3);
  });

  it('rejects a zero or negative volume', () => {
    expect(() =>
      refill(emptyTank(CAP), { id: 'z', volumeL: 0, pricePerLitre: 3800, boughtAt: '' })
    ).toThrow();
  });
});

describe('consume — FIFO', () => {
  it('burns the oldest layer first', () => {
    const t = tankWithFbu();
    const r = consume(t, 5);
    // 2 L @ 3600 = 7200, then 3 L @ 3900 = 11700 → 18900
    expect(r.costOfBurnedFuel).toBeCloseTo(18900, 6);
    expect(r.litresBurned).toBeCloseTo(5, 9);
  });

  it('leaves only the newest layer, which is what he is now running on', () => {
    const t = consume(tankWithFbu(), 5).tank;
    expect(t.layers).toHaveLength(1);
    expect(t.layers[0]).toMatchObject({ id: 'b', litres: 3 });
    expect(t.litres).toBeCloseTo(3, 9);
    expect(t.cost).toBeCloseTo(11700, 6);
  });

  it('keeps litre totals and cost reconcilable after a burn', () => {
    const t = consume(tankWithFbu(), 3.7).tank;
    expect(isConsistent(t)).toBe(true);
  });

  it('does not drift after many small burns', () => {
    let t = tankWithFbu();
    // 400 x 0.017 = 6.8 L, which the 8 L tank can cover without a shortfall.
    for (let i = 0; i < 400; i++) t = consume(t, 0.017).tank;
    expect(isConsistent(t)).toBe(true);
    expect(t.litres).toBeCloseTo(8 - 400 * 0.017, 6);
  });

  it('empties the tank exactly when the fuel runs out', () => {
    const t = consume(tankWithFbu(), 8).tank;
    expect(t.litres).toBeCloseTo(0, 9);
    expect(t.cost).toBeCloseTo(0, 6);
    expect(t.layers).toHaveLength(0);
    expect(blendedPrice(t)).toBeNull();
  });

  it('reports a shortfall instead of inventing fuel', () => {
    const r = consume(tankWithFbu(), 10);
    expect(r.shortfall).toBe(true);
    expect(r.litresBurned).toBeCloseTo(8, 9);
    expect(r.costOfBurnedFuel).toBeCloseTo(30600, 6);
    expect(r.tank.litres).toBeCloseTo(0, 9);
  });

  it('is a no-op for zero litres', () => {
    const t = tankWithFbu();
    const r = consume(t, 0);
    expect(r.litresBurned).toBe(0);
    expect(r.costOfBurnedFuel).toBe(0);
    expect(isConsistent(r.tank)).toBe(true);
  });

  it('rejects a negative burn', () => {
    expect(() => consume(tankWithFbu(), -1)).toThrow();
  });

  it('never leaves the tank below zero', () => {
    const r = consume(tankWithFbu(), 100);
    expect(r.tank.litres).toBeGreaterThanOrEqual(0);
    expect(r.tank.cost).toBeGreaterThanOrEqual(0);
  });
});

describe('setLevel — the five big buttons', () => {
  it('burns down to a stated lower level', () => {
    const r = setLevel(tankWithFbu(), 3);
    expect(r.tank.litres).toBeCloseTo(3, 9);
    expect(isConsistent(r.tank)).toBe(true);
  });

  it('takes the excess off the newest layer when the level is understated', () => {
    // Tank holds 8 L across two layers (2 L @ 3 600, 6 L @ 3 900). Saying
    // "5 L" means 3 L must go, and it comes off the newest layer first.
    const r = setLevel(tankWithFbu(), 5);
    expect(r.tank.litres).toBeCloseTo(5, 9);
    expect(r.tank.layers.map((l) => l.litres)).toEqual([2, 3]);
    expect(r.tank.cost).toBeCloseTo(2 * 3600 + 3 * 3900, 6);
    expect(isConsistent(r.tank)).toBe(true);
  });

  it('is a no-op when the level matches', () => {
    const t = tankWithFbu();
    const r = setLevel(t, 8);
    expect(r.tank.litres).toBeCloseTo(8, 9);
    expect(r.costOfBurnedFuel).toBe(0);
  });

  it('maps every preset to the right litres', () => {
    expect(levelToLitres('empty', CAP)).toBe(0);
    expect(levelToLitres('quarter', CAP)).toBe(15);
    expect(levelToLitres('half', CAP)).toBe(30);
    expect(levelToLitres('three_quarter', CAP)).toBe(45);
    expect(levelToLitres('full', CAP)).toBe(60);
    expect(Object.keys(FILL_LEVEL_FRACTION)).toHaveLength(5);
  });
});

describe('litresBurnedBetween — the full-to-full shortcut', () => {
  it('equals what he bought when the tank was full before and after', () => {
    expect(litresBurnedBetween(60, 45, 60)).toBeCloseTo(45, 9);
  });

  it('is exact for partial fills, because he told us the level', () => {
    // Started full, added 20 L, ended at 45 L → 60 + 20 - 45 = 35 burned.
    expect(litresBurnedBetween(60, 20, 45)).toBeCloseTo(35, 9);
  });

  it('never returns a negative burn', () => {
    expect(litresBurnedBetween(10, 5, 20)).toBe(0);
  });
});

describe('efficiency', () => {
  it('computes km per litre', () => {
    expect(efficiency(243, 22.5).kmPerLitre).toBeCloseTo(10.8, 6);
  });

  it('is null, not Infinity, when no fuel was burned', () => {
    expect(efficiency(0, 0).kmPerLitre).toBeNull();
    expect(efficiency(100, 0).kmPerLitre).toBeNull();
  });

  it('clamps nonsense to zero rather than reporting a negative economy', () => {
    expect(efficiency(-5, -2).kmPerLitre).toBeNull();
  });
});

describe('cash honesty', () => {
  it('counts tank contents as money he has not earned back', () => {
    expect(unrecoveredFuelMoney(tankWithFbu())).toBeCloseTo(30600, 6);
  });

  it('estimates remaining range from a known economy', () => {
    // 3 L at 10.6 km/L
    const t = consume(tankWithFbu(), 5).tank;
    expect(kmLeftInTank(t, 10.6)).toBeCloseTo(31.8, 6);
  });

  it('gives no range when the economy is unknown', () => {
    expect(kmLeftInTank(tankWithFbu(), null)).toBeNull();
    expect(kmLeftInTank(tankWithFbu(), 0)).toBeNull();
  });

  it('warns at the reserve level', () => {
    let t = tankWithFbu();
    expect(isAtReserve(t)).toBe(false);
    t = consume(t, 3).tank; // 5 L left, reserve is 5
    expect(isAtReserve(t)).toBe(true);
  });
});

describe('lastKnownPrice', () => {
  it('averages the layers we still hold', () => {
    expect(lastKnownPrice(tankWithFbu())).toBeCloseTo(3825, 6);
  });

  it('is zero on an empty tank rather than a magic constant', () => {
    expect(lastKnownPrice(emptyTank(CAP))).toBe(0);
  });
});