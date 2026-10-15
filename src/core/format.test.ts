import { describe, expect, it } from 'vitest';
import {
  formatDayFr,
  formatFBu,
  formatKm,
  formatKmPerLitre,
  formatLitres,
  formatPricePerLitre,
} from './format';

describe('formatFBu', () => {
  it('groupe les milliers avec une espace et ajoute FBu', () => {
    expect(formatFBu(45000)).toBe('45 000 FBu');
    expect(formatFBu(171000)).toBe('171 000 FBu');
    expect(formatFBu(980)).toBe('980 FBu');
  });

  it('arrondit au franc', () => {
    expect(formatFBu(18900.6)).toBe('18 901 FBu');
  });
});

describe('formatLitres', () => {
  it('une décimale avec virgule', () => {
    expect(formatLitres(22.5)).toBe('22,5 L');
    expect(formatLitres(60)).toBe('60,0 L');
  });
});

describe('formatPricePerLitre', () => {
  it('prix groupé par litre', () => {
    expect(formatPricePerLitre(3800)).toBe('3 800 FBu/L');
  });
});

describe('formatKmPerLitre', () => {
  it('une décimale avec virgule', () => {
    expect(formatKmPerLitre(10.8)).toBe('10,8 km/L');
  });

  it('données manquantes → tiret, jamais de mensonge', () => {
    expect(formatKmPerLitre(null)).toBe('—');
    expect(formatKmPerLitre(undefined)).toBe('—');
    expect(formatKmPerLitre(NaN)).toBe('—');
  });
});

describe('formatKm', () => {
  it('kilomètres avec virgule', () => {
    expect(formatKm(42)).toBe('42,0 km');
    expect(formatKm(4.7)).toBe('4,7 km');
  });
});

describe('formatDayFr', () => {
  it('jour français court', () => {
    expect(formatDayFr(new Date(2026, 9, 15, 12).getTime())).toBe('15 oct. 2026');
    expect(formatDayFr(new Date(2026, 0, 2, 12).getTime())).toBe('2 janv. 2026');
  });
});
