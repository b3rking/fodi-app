import { describe, expect, it } from 'vitest';
import {
  buildCycles,
  perKmStats,
  verdictFor,
  type CycleBurn,
  type CycleFill,
  type CycleTrip,
} from './breakeven';

describe('perKmStats', () => {
  it('calcule les ratios au km et les deux seuils', () => {
    const stats = perKmStats({
      revenueFBu: 468 * 243,
      revenueKm: 243,
      fuelBurnCostFBu: 85500,
      otherCostsFBu: 40 * 243,
      actualKmLitre: 10.8,
      blendedPricePerLitre: 3800,
      tripCount: 9,
    });
    expect(stats.revenuePerKm).toBeCloseTo(468, 10);
    expect(stats.fuelPerKm).toBeCloseTo(85500 / 243, 10);
    // Seuil carburant : 3 800 / 468 ≈ 8,1 km/L
    expect(stats.fuelBreakEvenKmL).toBeCloseTo(8.12, 2);
    // Vrai seuil : 3 800 / (468 − 40) ≈ 8,9 km/L
    expect(stats.trueBreakEvenKmL).toBeCloseTo(8.88, 2);
    // Marge : (10,8 − 8,88) / 8,88 ≈ +22 %
    expect(stats.efficiencyMarginPct).toBeCloseTo(21.6, 0);
  });

  it('sans km, aucun ratio (pas de division par zéro)', () => {
    const stats = perKmStats({
      revenueFBu: 0,
      revenueKm: 0,
      fuelBurnCostFBu: 0,
      otherCostsFBu: 0,
      actualKmLitre: null,
      blendedPricePerLitre: null,
      tripCount: 0,
    });
    expect(stats.revenuePerKm).toBeNull();
    expect(stats.trueBreakEvenKmL).toBeNull();
    expect(verdictFor(stats.profitMarginPct, 0)).toBe('unknown');
  });

  it('coûts autres ≥ recettes : pas de vrai seuil', () => {
    const stats = perKmStats({
      revenueFBu: 30000,
      revenueKm: 100,
      fuelBurnCostFBu: 20000,
      otherCostsFBu: 35000,
      actualKmLitre: 10,
      blendedPricePerLitre: 3800,
      tripCount: 5,
    });
    expect(stats.trueBreakEvenKmL).toBeNull();
    expect(verdictFor(stats.profitMarginPct, 5)).toBe('losing');
  });
});

describe('verdictFor', () => {
  it('seuils 15 % / 0 % et manque de données', () => {
    expect(verdictFor(16, 9)).toBe('making');
    expect(verdictFor(15, 9)).toBe('making');
    expect(verdictFor(7, 9)).toBe('even');
    expect(verdictFor(0, 9)).toBe('even');
    expect(verdictFor(-1, 9)).toBe('losing');
    expect(verdictFor(50, 2)).toBe('unknown');
    expect(verdictFor(null, 9)).toBe('unknown');
  });
});

describe('buildCycles', () => {
  const fills: CycleFill[] = [
    { ts: 1000, volumeL: 45, pricePerLitre: 3800, litresBeforeL: 15, litresAfterL: 60, odometerKm: 1000 },
    { ts: 2000, volumeL: 45, pricePerLitre: 3800, litresBeforeL: 15, litresAfterL: 60, odometerKm: 1243 },
  ];
  const trips: CycleTrip[] = [{ ts: 1500, km: 243, fare: 109350, extras: 0 }];
  const burns: CycleBurn[] = [{ startTs: 1000, endTs: 2000, consumedL: 22.5, costFBu: 85500 }];

  it('découpe plein-à-plein avec récupération', () => {
    const [cycle] = buildCycles(fills, 60, trips, burns);
    expect(cycle.done).toBe(true);
    expect(cycle.filledL).toBe(45);
    expect(cycle.km).toBe(243);
    expect(cycle.burnL).toBe(22.5);
    expect(cycle.profitFBu).toBe(109350 - 85500);
    // 109 350 / 171 000 ≈ 64 %… après un seul plein, pas encore remboursé
    expect(cycle.recoveryPct).toBeCloseTo(63.95, 1);
    expect(cycle.unburnedL).toBe(15);
  });

  it('sans plein complet, aucun cycle', () => {
    expect(buildCycles([], 60, trips, burns)).toEqual([]);
    expect(
      buildCycles(
        [{ ts: 1000, volumeL: 10, pricePerLitre: 3800, litresBeforeL: 5, litresAfterL: 15, odometerKm: 1000 }],
        60,
        trips,
        burns,
      ),
    ).toEqual([]);
  });

  it('dernier cycle en cours (pas de fin)', () => {
    const [cycle] = buildCycles([fills[0]], 60, trips, []);
    expect(cycle.done).toBe(false);
    expect(cycle.endTs).toBeNull();
    expect(cycle.unburnedL).toBeNull();
    expect(cycle.recoveryPct).toBeCloseTo(63.95, 1);
  });
});
