import { describe, expect, it } from 'vitest';
import { computeCycle, explainCycle } from './cycle';
import { consume, emptyTank, refill } from './engine';

const CAP = 60;
/** The formatter groups digits with U+202F, not a plain space. */
const NBSP = '\u202F';

const FILL_12 = {
  id: 'fill-12',
  ts: '2026-09-28T08:00:00Z',
  litres: 45,
  pricePerLitre: 3800,
  amount: 171000,
  station: 'Station Puma',
};

/** The plan's Tank cycle #12: 45 L at 3 800, 243 km, 109 350 FBu earned, 22.5 L left. */
function tankHalfUsed() {
  const start = refill(emptyTank(CAP, 5), {
    id: 'fill-12',
    volumeL: 45,
    pricePerLitre: 3800,
    boughtAt: '2026-09-28T08:00:00Z',
  }).tank;
  return consume(start, 22.5).tank;
}

function cycle12() {
  return computeCycle({
    fills: [FILL_12],
    tank: tankHalfUsed(),
    odoAtCycleStart: 118000,
    odoNow: 118243,
    faresEarned: 109350,
    otherIncomeEarned: 0,
  });
}

describe('computeCycle', () => {
  it('matches the plan\'s tank cycle card exactly', () => {
    const c = cycle12();
    expect(c.litresBought).toBeCloseTo(45, 9);
    expect(c.fuelPaid).toBeCloseTo(171000, 6);
    expect(c.pricePerLitre).toBeCloseTo(3800, 6);
    expect(c.litresBurned).toBeCloseTo(22.5, 9);
    expect(c.fuelCostBurned).toBeCloseTo(85500, 6);
    expect(c.km).toBeCloseTo(243, 9);
    expect(c.kmPerLitre).toBeCloseTo(10.8, 6);
    expect(c.revenuePerKm).toBeCloseTo(450, 6);
    expect(c.profit).toBeCloseTo(23850, 6);
    // 109 350 / 85 500 = 127.89%, shown as 128%
    expect(c.recoveryPct).toBeCloseTo(127.89, 2);
    expect(c.stillUnburnedL).toBeCloseTo(22.5, 9);
    expect(c.stillUnburnedValue).toBeCloseTo(85500, 6);
  });

  it('counts unburned fuel as money, not profit', () => {
    const c = cycle12();
    // profit uses fuel BURNED; the tank contents are separate
    expect(c.profit).not.toBe(c.fuelPaid + c.stillUnburnedValue);
    expect(c.shortfallToBreakEven).toBe(0);
  });

  it('reports how much fare is still needed when he is behind', () => {
    const c = computeCycle({
      fills: [FILL_12],
      tank: tankHalfUsed(),
      odoAtCycleStart: 1000,
      odoNow: 1100,
      faresEarned: 40000,
      otherIncomeEarned: 0,
    });
    expect(c.revenue).toBeCloseTo(40000, 6);
    expect(c.recoveryPct).toBeCloseTo(46.78, 2);
    expect(c.shortfallToBreakEven).toBeCloseTo(45500, 6);
    expect(c.profit).toBeCloseTo(-45500, 6);
  });

  it('counts other costs against profit but not against fuel recovery', () => {
    const withCosts = computeCycle({
      fills: [FILL_12],
      tank: tankHalfUsed(),
      odoAtCycleStart: 118000,
      odoNow: 118243,
      faresEarned: 109350,
      otherIncomeEarned: 0,
      otherCosts: 10000,
    });
    expect(withCosts.profit).toBeCloseTo(13850, 6);
    expect(withCosts.recoveryPct).toBeCloseTo(127.89, 2); // fuel recovery unchanged
  });

  it('handles a tank that has never been filled to full', () => {
    const c = computeCycle({
      fills: [],
      tank: emptyTank(CAP, 5),
      odoAtCycleStart: null,
      odoNow: 500,
      faresEarned: 0,
      otherIncomeEarned: 0,
    });
    expect(c.startedBy).toBeNull();
    expect(c.km).toBe(0);
    expect(c.kmPerLitre).toBeNull();
    expect(explainCycle(c)).toContain('Fill the tank to full');
  });

  it('never divides by zero with no trips and no km', () => {
    const c = computeCycle({
      fills: [FILL_12],
      tank: emptyTank(CAP, 5),
      odoAtCycleStart: 100,
      odoNow: 100,
      faresEarned: 0,
      otherIncomeEarned: 0,
    });
    expect(c.revenuePerKm).toBe(0);
    expect(c.fuelCostPerKm).toBe(0);
    expect(Number.isFinite(c.recoveryPct)).toBe(true);
  });
});

describe('explainCycle', () => {
  it('celebrates recovery past 100% with the fuel still in the tank', () => {
    const text = explainCycle(cycle12());
    expect(text).toContain('1.3 times over');
    expect(text).toContain(`85${NBSP}500${NBSP}FBu`); // still unburned value
  });

  it('is encouraging, not alarming, when he is still behind', () => {
    const c = computeCycle({
      fills: [FILL_12],
      tank: tankHalfUsed(),
      odoAtCycleStart: 1000,
      odoNow: 1100,
      faresEarned: 40000,
      otherIncomeEarned: 0,
    });
    expect(explainCycle(c)).toContain('47%');
    expect(explainCycle(c)).toContain('still needed');
  });
});