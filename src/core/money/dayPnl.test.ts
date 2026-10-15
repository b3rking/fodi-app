import { describe, expect, it } from 'vitest';
import { buildDailyPnl, dayKeyLocal } from './dayPnl';

describe('dayKeyLocal', () => {
  it('clé calendaire locale', () => {
    expect(dayKeyLocal(new Date(2026, 9, 15, 23, 30).getTime())).toBe('2026-10-15');
  });
});

describe('buildDailyPnl', () => {
  const day1 = new Date(2026, 9, 15, 10).getTime();
  const day2 = new Date(2026, 9, 16, 10).getTime();

  it('cumule courses, carburant, coûts et revenus par jour', () => {
    const days = buildDailyPnl({
      trips: [
        { ts: day1, km: 10, fare: 4500, extras: 0, fuelCostFBu: 3600 },
        { ts: day1, km: 5, fare: 2500, extras: 500, fuelCostFBu: null },
        { ts: day2, km: 20, fare: 9000, extras: 0, fuelCostFBu: 7000 },
      ],
      expenses: [{ ts: day1, amount: 600 }],
      incomes: [{ ts: day2, amount: 2000 }],
      occurrences: [{ ts: day1, amount: 1000 }],
    });
    expect(days).toHaveLength(2);
    expect(days[0].km).toBe(15);
    expect(days[0].fares).toBe(7500);
    expect(days[0].fuel).toBe(3600);
    expect(days[0].other).toBe(1600);
    expect(days[0].profit).toBe(7500 - 3600 - 1600);
    expect(days[1].profit).toBe(9000 + 2000 - 7000);
  });

  it('trié par date croissante', () => {
    const days = buildDailyPnl({
      trips: [{ ts: day2, km: 1, fare: 1, extras: 0, fuelCostFBu: null }],
      expenses: [],
      incomes: [],
      occurrences: [],
    });
    expect(days).toHaveLength(1);
  });
});
