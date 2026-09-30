import { describe, expect, it } from 'vitest';
import {
  computeBreakEven,
  explainBreakEven,
  paceProjection,
  totalsToPerKm,
  verdictLabel,
} from './breakeven';
import { consume, emptyTank, refill } from './engine';

const CAP = 60;
/** The formatter groups digits with U+202F, not a plain space. */
const NBSP = '\u202F';

/** The tank from the plan: 45 L at 3 800, then 22.5 L burned → 22.5 L left. */
function tankAt3800() {
  let t = emptyTank(CAP, 5);
  t = refill(t, { id: 'a', volumeL: 45, pricePerLitre: 3800, boughtAt: '2026-09-28T08:00:00Z' }).tank;
  return consume(t, 22.5).tank;
}

/** September from the plan: 2 140 km, profit 157 000 FBu. */
const SEPTEMBER = {
  km: 2140,
  fares: 963000,
  otherIncome: 38000,
  fuelCost: 758000,
  otherCosts: 86000,
};

describe('totalsToPerKm', () => {
  it('matches the plan\'s September numbers', () => {
    const p = totalsToPerKm(SEPTEMBER);
    // 1 001 000 / 2 140 = 467.76, which the UI shows as 468 FBu/km
    expect(p.revenuePerKm).toBeCloseTo(467.757, 3);
    expect(p.fuelPerKm).toBeCloseTo(354.2, 1);    // 758 000 / 2 140
    expect(p.otherPerKm).toBeCloseTo(40.2, 1);    // 86 000 / 2 140
    expect(p.costPerKm).toBeCloseTo(394.4, 1);
    expect(p.profitPerKm).toBeCloseTo(73.4, 1);
    expect(p.profit).toBeCloseTo(157000, 6);
    // 157 000 / 1 001 000, which clears the 15% threshold for MAKING MONEY
    expect(p.profitMarginPct).toBeCloseTo(15.68, 2);
  });

  it('returns zeros rather than NaN when nothing was driven', () => {
    const p = totalsToPerKm({ km: 0, fares: 5000, otherIncome: 0, fuelCost: 0, otherCosts: 0 });
    expect(p.revenuePerKm).toBe(0);
    expect(p.profitPerKm).toBe(0);
    expect(Number.isFinite(p.profitPerKm)).toBe(true);
  });

  it('counts a loss as a negative profit, not a hidden zero', () => {
    const p = totalsToPerKm({ km: 100, fares: 10000, otherIncome: 0, fuelCost: 20000, otherCosts: 0 });
    expect(p.profitPerKm).toBeCloseTo(-100, 6);
    expect(p.profitMarginPct).toBeLessThan(0);
  });
});

describe('computeBreakEven', () => {
  it('reproduces the plan: 8.9 km/L break-even, 22% engine margin', () => {
    const perKm = totalsToPerKm(SEPTEMBER);
    const be = computeBreakEven({ perKm, tank: tankAt3800(), actualKmPerL: 10.8, tripCount: 240 });

    // fuel only: 3800 / 467.757 = 8.124
    expect(be.fuelBreakEvenKmPerL).toBeCloseTo(8.1239, 4);
    // with other costs: 3800 / (467.757 - 40.187) = 8.887
    expect(be.trueBreakEvenKmPerL).toBeCloseTo(8.8874, 4);
    expect(be.efficiencyMarginKmPerL).toBeCloseTo(1.9126, 4);
    expect(be.efficiencyMarginPct).toBeCloseTo(21.52, 2);
    expect(be.verdict).toBe('making_money');
  });

  it('reproduces the losing case: 145 FBu lost per km at 4 300 FBu/L and 7.5 km/L', () => {
    // Revenue 468/km, fuel 4 300/L at 7.5 km/L = 573.33/km, other 40/km.
    const perKm = totalsToPerKm({
      km: 100,
      fares: 46800,
      otherIncome: 0,
      fuelCost: (4300 / 7.5) * 100,
      otherCosts: 4000,
    });

    // Break-even uses the price in the tank, so the tank must hold 4 300 FBu/L.
    let expensive = emptyTank(CAP, 5);
    expensive = refill(expensive, {
      id: 'x',
      volumeL: 45,
      pricePerLitre: 4300,
      boughtAt: '2026-09-28T08:00:00Z',
    }).tank;

    const be = computeBreakEven({ perKm, tank: expensive, actualKmPerL: 7.5, tripCount: 10 });

    // 4300 / (468 - 40) = 10.05 km/L needed
    expect(be.trueBreakEvenKmPerL).toBeCloseTo(10.05, 2);
    expect(be.fuelBreakEvenKmPerL).toBeCloseTo(9.19, 2);
    expect(be.efficiencyMarginKmPerL).toBeCloseTo(-2.55, 2);
    expect(be.verdict).toBe('losing_money');
    expect(perKm.profitPerKm).toBeCloseTo(-145.33, 2);
  });

  it('uses the price in the tank, not the last price he paid', () => {
    let t = emptyTank(CAP, 5);
    t = refill(t, { id: 'old', volumeL: 30, pricePerLitre: 3000, boughtAt: '2026-08-01T08:00:00Z' }).tank;
    t = refill(t, { id: 'new', volumeL: 30, pricePerLitre: 4600, boughtAt: '2026-09-01T08:00:00Z' }).tank;
    const be = computeBreakEven({
      perKm: totalsToPerKm(SEPTEMBER),
      tank: t,
      actualKmPerL: 10,
      tripCount: 100,
    });
    expect(be.blendedPrice).toBeCloseTo(3800, 6);
  });

  it('says break-even does not exist when other costs exceed income', () => {
    const perKm = totalsToPerKm({ km: 100, fares: 20000, otherIncome: 0, fuelCost: 0, otherCosts: 25000 });
    const be = computeBreakEven({ perKm, tank: tankAt3800(), actualKmPerL: 10, tripCount: 10 });
    expect(be.breakEvenExists).toBe(false);
    expect(be.trueBreakEvenKmPerL).toBeNull();
    expect(explainBreakEven(be, perKm)).toContain('Même le carburant gratuit ne te sauvera pas');
  });

  it('refuses a verdict on too little data', () => {
    const be = computeBreakEven({
      perKm: totalsToPerKm(SEPTEMBER),
      tank: tankAt3800(),
      actualKmPerL: 10.8,
      tripCount: 1,
    });
    expect(be.verdict).toBe('not_enough_data');
    expect(verdictLabel(be.verdict)).toBe('PAS ASSEZ DE DONNÉES');
  });

  it('gives no margin when the economy is unknown, but still a verdict', () => {
    const be = computeBreakEven({
      perKm: totalsToPerKm(SEPTEMBER),
      tank: tankAt3800(),
      actualKmPerL: null,
      tripCount: 240,
    });
    expect(be.efficiencyMarginPct).toBeNull();
    expect(be.verdict).toBe('making_money');
  });

  it('never divides by zero on an empty tank', () => {
    const perKm = totalsToPerKm(SEPTEMBER);
    const be = computeBreakEven({
      perKm,
      tank: emptyTank(CAP),
      actualKmPerL: 10,
      tripCount: 100,
    });
    expect(be.blendedPrice).toBeNull();
    expect(be.trueBreakEvenKmPerL).toBeNull();
    expect(be.efficiencyMarginPct).toBeNull();
    // Still gives a verdict from the P&L, because that does not need the tank.
    expect(be.verdict).toBe('making_money');
    expect(explainBreakEven(be, perKm)).not.toMatch(/NaN|Infinity/);
  });

  it('calls a thin margin "breaking even", not "making money"', () => {
    const perKm = totalsToPerKm({ km: 100, fares: 50000, otherIncome: 0, fuelCost: 45000, otherCosts: 3000 });
    const be = computeBreakEven({ perKm, tank: tankAt3800(), actualKmPerL: 10, tripCount: 10 });
    expect(perKm.profitMarginPct).toBeLessThan(15);
    expect(be.verdict).toBe('breaking_even');
  });
});

describe('explainBreakEven', () => {
  it('says the actionable thing when losing money', () => {
    const perKm = totalsToPerKm({ km: 100, fares: 46800, otherIncome: 0, fuelCost: 61300, otherCosts: 0 });
    const be = computeBreakEven({ perKm, tank: tankAt3800(), actualKmPerL: 7.5, tripCount: 10 });
    const text = explainBreakEven(be, perKm);
    expect(text).toContain('il te manque');
    expect(text).toContain(`1${NBSP}450${NBSP}FBu`);   // 145 par km x 10
    expect(text).toContain('Deux solutions');
    // Amounts use the space grouping, not a comma.
    expect(text).not.toMatch(/\d,\d{3}/);
  });

  it('says the safety net when making money', () => {
    const perKm = totalsToPerKm(SEPTEMBER);
    const be = computeBreakEven({ perKm, tank: tankAt3800(), actualKmPerL: 10.8, tripCount: 240 });
    expect(explainBreakEven(be, perKm)).toContain('22% de rendement');
  });

  it('produces a sentence with no NaN, ever', () => {
    const perKm = totalsToPerKm(SEPTEMBER);
    for (const tank of [emptyTank(CAP), tankAt3800()]) {
      for (const actual of [null, 0, 5, 15]) {
        const be = computeBreakEven({ perKm, tank, actualKmPerL: actual, tripCount: 240 });
        const text = explainBreakEven(be, perKm);
        expect(text).not.toMatch(/NaN|Infinity|undefined|null/);
      }
    }
  });
});

describe('paceProjection', () => {
  it('extrapolates today to a full day, clearly labelled as a projection', () => {
    // A normal day: 42 km, 18 400 earned, 14 820 fuel, 600 other
    const today = totalsToPerKm({
      km: 42,
      fares: 18400,
      otherIncome: 0,
      fuelCost: 14820,
      otherCosts: 600,
    });
    expect(today.profitPerKm).toBeCloseTo(70.95, 2);
    // 70.95 FBu/km on an 80 km day = 5 676, which the UI rounds to 5 680
    expect(paceProjection(today, 80)).toBeCloseTo(5676, 0);
  });

  it('gives nothing before the day has started', () => {
    expect(paceProjection(totalsToPerKm({ ...SEPTEMBER, km: 0 }), 80)).toBeNull();
  });
});