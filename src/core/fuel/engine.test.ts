import { describe, expect, it } from 'vitest';
import {
  blendedPrice,
  consume,
  createEmptyTank,
  FuelError,
  litresFromLevel,
  maxFillable,
  openingBalance,
  refill,
  replayFills,
  tankCost,
  tankLevelFractions,
  totalLitres,
} from './engine';

describe('createEmptyTank', () => {
  it('crée un réservoir vide à la bonne capacité', () => {
    const tank = createEmptyTank(60);
    expect(totalLitres(tank)).toBe(0);
    expect(blendedPrice(tank)).toBeNull();
  });

  it('rejette une capacité invalide', () => {
    expect(() => createEmptyTank(0)).toThrowError(FuelError);
    expect(() => createEmptyTank(-5)).toThrowError(FuelError);
    expect(() => createEmptyTank(NaN)).toThrowError(FuelError);
  });
});

describe('refill', () => {
  it('empile les couches de prix', () => {
    let tank = createEmptyTank(60);
    tank = refill(tank, { volumeL: 2, pricePerLitre: 3600 });
    tank = refill(tank, { volumeL: 6, pricePerLitre: 3900 });
    expect(totalLitres(tank)).toBe(8);
    expect(tankCost(tank)).toBe(2 * 3600 + 6 * 3900);
    expect(blendedPrice(tank)).toBeCloseTo(30600 / 8, 10);
  });

  it('fond les frais dans le prix effectif de la couche', () => {
    const tank = refill(createEmptyTank(60), { volumeL: 10, pricePerLitre: 3800, feeFBu: 2000 });
    expect(tankCost(tank)).toBe(40000);
    expect(blendedPrice(tank)).toBe(4000);
  });

  it('ne modifie pas l’état reçu (immuable)', () => {
    const before = createEmptyTank(60);
    refill(before, { volumeL: 5, pricePerLitre: 3800 });
    expect(totalLitres(before)).toBe(0);
  });

  it('rejette les entrées invalides', () => {
    const tank = createEmptyTank(60);
    expect(() => refill(tank, { volumeL: 0, pricePerLitre: 3800 })).toThrowError(FuelError);
    expect(() => refill(tank, { volumeL: -2, pricePerLitre: 3800 })).toThrowError(FuelError);
    expect(() => refill(tank, { volumeL: 5, pricePerLitre: 0 })).toThrowError(FuelError);
    expect(() => refill(tank, { volumeL: 5, pricePerLitre: 3800, feeFBu: -1 })).toThrowError(FuelError);
  });

  it('signale le débordement avec le maximum exact', () => {
    let tank = createEmptyTank(60);
    tank = refill(tank, { volumeL: 50, pricePerLitre: 3800 });
    expect(maxFillable(tank)).toBe(10);
    try {
      refill(tank, { volumeL: 51, pricePerLitre: 3800 });
      expect.unreachable('aurait dû déborder');
    } catch (e) {
      expect(e).toBeInstanceOf(FuelError);
      expect((e as FuelError).code).toBe('OVERFLOW');
      expect((e as FuelError).details?.maxLitres).toBe(10);
    }
  });
});

describe('consume (FIFO)', () => {
  it('brûle le carburant le plus ancien d’abord — exemple du plan au franc près', () => {
    let tank = createEmptyTank(60);
    tank = refill(tank, { volumeL: 2, pricePerLitre: 3600 });
    tank = refill(tank, { volumeL: 6, pricePerLitre: 3900 });
    const burned = consume(tank, 5);
    // 2 L @ 3 600 + 3 L @ 3 900 = 18 900
    expect(burned.consumedL).toBe(5);
    expect(burned.costFBu).toBe(18900);
    expect(totalLitres(burned.tank)).toBe(3);
    expect(tankCost(burned.tank)).toBe(11700);
    expect(blendedPrice(burned.tank)).toBe(3900);
    // L'état d'origine est intact
    expect(totalLitres(tank)).toBe(8);
  });

  it('plafonne à ce qui reste quand on demande trop', () => {
    let tank = createEmptyTank(60);
    tank = refill(tank, { volumeL: 5, pricePerLitre: 3800 });
    const burned = consume(tank, 999);
    expect(burned.consumedL).toBe(5);
    expect(burned.costFBu).toBe(19000);
    expect(totalLitres(burned.tank)).toBe(0);
    expect(blendedPrice(burned.tank)).toBeNull();
  });

  it('consommer zéro ne change rien', () => {
    let tank = createEmptyTank(60);
    tank = refill(tank, { volumeL: 5, pricePerLitre: 3800 });
    const burned = consume(tank, 0);
    expect(burned.consumedL).toBe(0);
    expect(burned.costFBu).toBe(0);
    expect(totalLitres(burned.tank)).toBe(5);
  });

  it('rejette une consommation négative', () => {
    expect(() => consume(createEmptyTank(60), -1)).toThrowError(FuelError);
  });

  it('les couches au prix inconnu se consomment à coût nul', () => {
    const tank = { capacityL: 60, layers: [openingBalance(10)] };
    expect(blendedPrice(tank)).toBeNull();
    const burned = consume(tank, 4);
    expect(burned.costFBu).toBe(0);
    expect(totalLitres(burned.tank)).toBe(6);
  });
});

describe('replayFills', () => {
  it('rejoue l’exemple complet du plan', () => {
    const replay = replayFills(60, [
      { volumeL: 2, pricePerLitre: 3600, litresBeforeL: 0, litresAfterL: 2, odometerKm: 1000 },
      { volumeL: 6, pricePerLitre: 3900, litresBeforeL: 2, litresAfterL: 8, odometerKm: 1000 },
      { volumeL: 12, pricePerLitre: 3750, litresBeforeL: 3, litresAfterL: 15, odometerKm: 1054 },
    ]);
    expect(totalLitres(replay.tank)).toBe(15);
    expect(tankCost(replay.tank)).toBe(56700);
    expect(blendedPrice(replay.tank)).toBe(3780);
    expect(replay.totalConsumedL).toBe(5);
    expect(replay.totalBurnCostFBu).toBe(18900);
    // 54 km pour 5 L = 10,8 km/L
    expect(replay.totalKm).toBe(54);
    expect(replay.overallKmPerLitre).toBeCloseTo(10.8, 10);
    expect(replay.intervals[2].kmPerLitre).toBeCloseTo(10.8, 10);
  });

  it('sans compteur, pas de km/L (pas de mensonge)', () => {
    const replay = replayFills(60, [
      { volumeL: 10, pricePerLitre: 3800, litresBeforeL: 0, litresAfterL: 10 },
    ]);
    expect(replay.totalKm).toBeNull();
    expect(replay.overallKmPerLitre).toBeNull();
    expect(totalLitres(replay.tank)).toBe(10);
  });

  it('ignore un compteur qui recule (donnée gardée, pas de calcul faux)', () => {
    const replay = replayFills(60, [
      { volumeL: 10, pricePerLitre: 3800, litresBeforeL: 0, litresAfterL: 10, odometerKm: 2000 },
      { volumeL: 10, pricePerLitre: 3800, litresBeforeL: 4, litresAfterL: 14, odometerKm: 1999 },
    ]);
    expect(replay.intervals[1].km).toBeNull();
    expect(replay.intervals[1].kmPerLitre).toBeNull();
  });

  it('le fond initial inconnu ne fausse pas le prix mixte', () => {
    const replay = replayFills(60, [
      { volumeL: 20, pricePerLitre: 3800, litresBeforeL: 10, litresAfterL: 25, odometerKm: 500 },
    ]);
    // 10 L inconnus + 20 L @ 3 800, rien brûlé (photo avant = 10, contenu = 10)
    expect(totalLitres(replay.tank)).toBe(30);
    expect(tankCost(replay.tank)).toBe(76000);
  });
});

describe('niveaux de réservoir', () => {
  it('cinq boutons, fractions exactes', () => {
    expect(tankLevelFractions).toEqual({
      empty: 0,
      quarter: 0.25,
      half: 0.5,
      threeQuarter: 0.75,
      full: 1,
    });
    expect(litresFromLevel('half', 60)).toBe(30);
    expect(litresFromLevel('full', 60)).toBe(60);
  });
});
