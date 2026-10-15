import { describe, expect, it } from 'vitest';
import {
  expandRecurrence,
  expandRecurrings,
  monthRange,
  periodTotals,
  totalsByCategory,
  type RecurrenceRule,
} from './period';

const rule = (over: Partial<RecurrenceRule> = {}): RecurrenceRule => ({
  id: 1,
  label: 'Data',
  amount: 15000,
  cadence: 'monthly',
  nextDueMs: new Date(2026, 9, 4, 12).getTime(),
  active: true,
  ...over,
});

describe('expandRecurrence', () => {
  it('mensuel : même quantième chaque mois', () => {
    const { from, to } = monthRange(2026, 9);
    const end = monthRange(2027, 0).to;
    const occ = expandRecurrence(rule(), from, end);
    expect(occ.map((o) => new Date(o.ts).getDate())).toEqual([4, 4, 4, 4]);
  });

  it('mensuel : 31 janvier → 28 février (mois trop court)', () => {
    const r = rule({ nextDueMs: new Date(2026, 0, 31, 12).getTime() });
    const occ = expandRecurrence(r, new Date(2026, 0, 1).getTime(), new Date(2026, 3, 1).getTime());
    const days = occ.map((o) => {
      const d = new Date(o.ts);
      return [d.getMonth(), d.getDate()];
    });
    expect(days).toEqual([
      [0, 31],
      [1, 28],
      [2, 28],
    ]);
  });

  it('hebdo : tous les 7 jours', () => {
    const r = rule({ cadence: 'weekly', nextDueMs: new Date(2026, 9, 2, 12).getTime() });
    const occ = expandRecurrence(r, new Date(2026, 9, 1).getTime(), new Date(2026, 9, 31).getTime());
    expect(occ).toHaveLength(5);
    for (let i = 1; i < occ.length; i++) {
      expect(occ[i].ts - occ[i - 1].ts).toBe(7 * 24 * 3600 * 1000);
    }
  });

  it('ignore les règles inactives et les montants invalides', () => {
    const { from, to } = monthRange(2026, 9);
    expect(expandRecurrence(rule({ active: false }), from, to)).toEqual([]);
    expect(expandRecurrence(rule({ amount: -5 }), from, to)).toEqual([]);
  });

  it('ne génère rien avant la prochaine échéance ni après la fin', () => {
    const r = rule({ nextDueMs: new Date(2026, 9, 20, 12).getTime() });
    const { from, to } = monthRange(2026, 9);
    expect(expandRecurrence(r, from, to).map((o) => new Date(o.ts).getDate())).toEqual([20]);
  });
});

describe('expandRecurrings', () => {
  it('fusionne et trie les règles', () => {
    const { from, to } = monthRange(2026, 9);
    const occ = expandRecurrings(
      [
        rule({ id: 1, nextDueMs: new Date(2026, 9, 15, 12).getTime() }),
        rule({ id: 2, nextDueMs: new Date(2026, 9, 4, 12).getTime() }),
      ],
      from,
      to,
    );
    expect(occ.map((o) => o.ruleId)).toEqual([2, 1]);
  });
});

describe('monthRange', () => {
  it('couvre exactement le mois calendaire', () => {
    const { from, to } = monthRange(2026, 8);
    expect(new Date(from)).toEqual(new Date(2026, 8, 1));
    expect(new Date(to)).toEqual(new Date(2026, 9, 1));
  });
});

describe('totalsByCategory', () => {
  it('cumule et trie par montant décroissant', () => {
    const totals = totalsByCategory([
      { ts: 1, amount: 1000, categoryId: 'a' },
      { ts: 2, amount: 5000, categoryId: 'b' },
      { ts: 3, amount: 2000, categoryId: 'a' },
    ]);
    expect(totals).toEqual([
      { categoryId: 'b', total: 5000, count: 1 },
      { categoryId: 'a', total: 3000, count: 2 },
    ]);
  });
});

describe('periodTotals', () => {
  it('entrées − sorties', () => {
    expect(periodTotals(1001000, 844000)).toEqual({
      moneyIn: 1001000,
      moneyOut: 844000,
      left: 157000,
    });
  });
});
