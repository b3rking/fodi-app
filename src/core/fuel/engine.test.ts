import { describe, expect, it } from 'vitest';
import {
  autoLevelLabel,
  blendedPrice,
  consume,
  createEmptyTank,
  currentLevelLabel,
  DEFAULT_TANK_LEVELS,  FuelError,
  levelsForBarCount,
  litresFromFraction,
  maxFillable,
  openingBalance,
  refill,
  replayFills,
  replayLiveTank,
  tankCost,
  totalLitres,
  validateTankLevels,
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

describe('niveaux de réservoir personnalisés', () => {
  it('niveaux d’origine : cinq boutons de 0 à 100 %', () => {
    expect(DEFAULT_TANK_LEVELS.map((l) => l.fraction)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(litresFromFraction(0.5, 60)).toBe(30);
    expect(litresFromFraction(1, 60)).toBe(60);
  });

  it('valide une liste correcte', () => {
    expect(validateTankLevels(DEFAULT_TANK_LEVELS)).toBeNull();
  });

  it('rejette les listes trop courtes ou trop longues', () => {
    expect(validateTankLevels([])).not.toBeNull();
    expect(
      validateTankLevels(
        Array.from({ length: 13 }, (_, i) => ({ id: `l${i}`, label: `N${i}`, fraction: i / 12 })),
      ),
    ).not.toBeNull();
  });

  it('rejette les noms vides ou en double', () => {
    expect(
      validateTankLevels([
        { id: 'a', label: '  ', fraction: 0 },
        { id: 'b', label: 'Plein', fraction: 1 },
      ]),
    ).not.toBeNull();
    expect(
      validateTankLevels([
        { id: 'a', label: 'Moitié', fraction: 0 },
        { id: 'b', label: 'Moitié', fraction: 1 },
      ]),
    ).not.toBeNull();
  });

  it('rejette les pourcentages hors limites ou en double', () => {
    expect(
      validateTankLevels([
        { id: 'a', label: 'Vide', fraction: -0.1 },
        { id: 'b', label: 'Plein', fraction: 1 },
      ]),
    ).not.toBeNull();
    expect(
      validateTankLevels([
        { id: 'a', label: 'Vide', fraction: 0 },
        { id: 'b', label: 'Plein', fraction: NaN },
      ]),
    ).not.toBeNull();
    expect(
      validateTankLevels([
        { id: 'a', label: 'Vide', fraction: 0 },
        { id: 'b', label: 'Milieu', fraction: 0.5 },
        { id: 'c', label: 'Encore', fraction: 0.5 },
        { id: 'd', label: 'Plein', fraction: 1 },
      ]),
    ).not.toBeNull();
  });

  it('exige 0 % en premier et 100 % en dernier', () => {
    expect(
      validateTankLevels([
        { id: 'a', label: 'Bas', fraction: 0.1 },
        { id: 'b', label: 'Plein', fraction: 1 },
      ]),
    ).not.toBeNull();
    expect(
      validateTankLevels([
        { id: 'a', label: 'Vide', fraction: 0 },
        { id: 'b', label: 'Haut', fraction: 0.9 },
      ]),
    ).not.toBeNull();
  });
});

describe('levelsForBarCount', () => {
  it('4 barres : Vide · ⅓ · ⅔ · Plein', () => {
    const levels = levelsForBarCount(4);
    expect(levels.map((l) => l.fraction)).toEqual([0, 1 / 3, 2 / 3, 1]);
    expect(levels.map((l) => l.label)).toEqual(['Vide', '⅓', '⅔', 'Plein']);
    expect(validateTankLevels(levels)).toBeNull();
  });

  it('5 barres : symboles de quarts', () => {
    expect(levelsForBarCount(5).map((l) => l.label)).toEqual([
      'Vide',
      '¼',
      '½',
      '¾',
      'Plein',
    ]);
  });

  it('8 barres : pourcentages arrondis', () => {
    const levels = levelsForBarCount(8);
    expect(levels[0].label).toBe('Vide');
    expect(levels[7].label).toBe('Plein');
    expect(levels[1].label).toBe('14 %');
    expect(validateTankLevels(levels)).toBeNull();
  });

  it('rejette les nombres hors limites', () => {
    for (const n of [0, 1, 13, 2.5, NaN]) {
      expect(() => levelsForBarCount(n)).toThrowError(FuelError);
    }
  });

  it('libellés auto : cas limites', () => {
    expect(autoLevelLabel(0)).toBe('Vide');
    expect(autoLevelLabel(1)).toBe('Plein');
    expect(autoLevelLabel(0.1)).toBe('10 %');
  });

  it('niveau courant : le plus élevé atteint', () => {
    expect(currentLevelLabel(DEFAULT_TANK_LEVELS, 0)).toBe('Vide');
    expect(currentLevelLabel(DEFAULT_TANK_LEVELS, 0.6)).toBe('½');
    expect(currentLevelLabel(DEFAULT_TANK_LEVELS, 1)).toBe('Plein');
    expect(currentLevelLabel([], 0.5)).toBe('');
  });
});

describe('replayLiveTank', () => {
  const fills = [
    { volumeL: 20, pricePerLitre: 3800, litresBeforeL: 0, litresAfterL: 20, odometerKm: 1000, ts: 1000 },
    { volumeL: 10, pricePerLitre: 3800, litresBeforeL: 10, litresAfterL: 20, odometerKm: 1108, ts: 2000 },
  ];

  it('sans trajet, réservoir photo intact', () => {
    const live = replayLiveTank(60, fills, []);
    expect(totalLitres(live.tank)).toBe(20);
    expect(live.estimatedBurnL).toBe(0);
  });

  it('déduit le brûlé estimé des trajets postérieurs (10,8 km/L)', () => {
    // 108 km / 10,8 = 10 L
    const live = replayLiveTank(60, fills, [{ ts: 2500, km: 108 }]);
    expect(live.estimatedBurnL).toBeCloseTo(10, 10);
    expect(totalLitres(live.tank)).toBe(10);
  });

  it('la surcharge manuelle est prioritaire', () => {
    const live = replayLiveTank(60, fills, [{ ts: 2500, km: 108, fuelL: 4 }]);
    expect(live.estimatedBurnL).toBe(4);
    expect(totalLitres(live.tank)).toBe(16);
  });

  it('ignore les trajets antérieurs et plafonne à zéro', () => {
    const live = replayLiveTank(60, fills, [
      { ts: 1500, km: 500 },
      { ts: 2500, km: 1080 },
    ]);
    expect(totalLitres(live.tank)).toBe(0);
  });

  it('sans conso mesurée, seuls les manuels comptent', () => {
    const noOdo = fills.map((f) => ({
      volumeL: f.volumeL,
      pricePerLitre: f.pricePerLitre,
      litresBeforeL: f.litresBeforeL,
      litresAfterL: f.litresAfterL,
      ts: f.ts,
    }));
    const live = replayLiveTank(60, noOdo, [
      { ts: 2500, km: 100 },
      { ts: 2600, km: 50, fuelL: 3 },
    ]);
    expect(live.estimatedBurnL).toBe(3);
    expect(totalLitres(live.tank)).toBe(17);
  });
});
