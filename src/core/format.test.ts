import { describe, expect, it } from 'vitest';
import {
  fbu,
  fbuPerKm,
  fbuPerLitre,
  fbuShort,
  km,
  kmPerLitre,
  litres,
  pct,
  relativeDays,
} from './format';

const NBSP = '\u202F';

describe('fbu', () => {
  it('groups thousands the French/Burundian way', () => {
    expect(fbu(85500)).toBe(`85${NBSP}500${NBSP}FBu`);
    expect(fbu(1000000)).toBe(`1${NBSP}000${NBSP}000${NBSP}FBu`);
    expect(fbu(999)).toBe(`999${NBSP}FBu`);
  });

  it('always states the unit, because a bare number means nothing', () => {
    expect(fbu(450)).toContain('FBu');
  });

  it('uses a real minus sign for losses', () => {
    expect(fbu(-1200)).toBe(`−1${NBSP}200${NBSP}FBu`);
    expect(fbu(-1200)).not.toContain('-');
  });

  it('rounds to whole francs', () => {
    expect(fbu(4532.4)).toBe(fbu(4532));
    expect(fbu(4532.6)).toBe(fbu(4533));
  });

  it('handles zero without special-casing', () => {
    expect(fbu(0)).toBe(`0${NBSP}FBu`);
  });
});

describe('fbuShort', () => {
  it('omits the unit for tight spaces', () => {
    expect(fbuShort(85500)).toBe(`85${NBSP}500`);
    expect(fbuShort(-1200)).toBe(`−1${NBSP}200`);
  });
});

describe('unit formatters', () => {
  it('formats litres, km and km/L', () => {
    expect(litres(22.5)).toBe(`22.5${NBSP}L`);
    expect(litres(8)).toBe(`8.0${NBSP}L`);
    expect(km(4.7)).toBe(`4.7${NBSP}km`);
    expect(kmPerLitre(10.8)).toBe(`10.8${NBSP}km/L`);
  });

  it('shows a dash for an unknown economy, never a zero', () => {
    expect(kmPerLitre(null)).toBe('—');
    expect(fbuPerLitre(null)).toBe('—');
    expect(pct(null)).toBe('—');
    expect(pct(NaN)).toBe('—');
    expect(pct(Infinity)).toBe('—');
  });

  it('formats per-km and per-litre prices', () => {
    expect(fbuPerKm(467.757)).toBe(`468${NBSP}FBu/km`);
    expect(fbuPerLitre(3800)).toBe(`3${NBSP}800${NBSP}FBu/L`);
    expect(pct(21.5199)).toBe('22%');
  });
});

describe('relativeDays', () => {
  it('reads naturally for a driver', () => {
    expect(relativeDays(0)).toBe('today');
    expect(relativeDays(1)).toBe('yesterday');
    expect(relativeDays(4)).toBe('4 days ago');
    expect(relativeDays(8)).toBe('last week');
    expect(relativeDays(21)).toBe('3 weeks ago');
    expect(relativeDays(90)).toBe('3 months ago');
  });
});