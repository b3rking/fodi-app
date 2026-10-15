/**
 * Monnaie — fonctions pures : expansion des récurrences, totaux de période.
 * Les occurrences générées portent le tag `auto` côté UI avec leur formule.
 */

export type Cadence = 'weekly' | 'monthly';

export interface RecurrenceRule {
  id: number;
  label: string;
  amount: number;
  cadence: Cadence;
  /** Prochaine échéance (ms). Les occurrences démarrent ici. */
  nextDueMs: number;
  active: boolean;
}

export interface Occurrence {
  key: string;
  ts: number;
  label: string;
  amount: number;
  ruleId: number;
}

const DAY_MS = 24 * 3600 * 1000;

function addMonthsClamped(ts: number, months: number): number {
  const d = new Date(ts);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d.getTime();
}

/**
 * Génère les échéances d'une règle dans `[fromMs, toMs[` :
 * hebdo = tous les 7 jours, mensuel = même quantième (dernier jour
 * du mois si le mois est trop court, ex. 31 janv. → 28 févr.).
 */
export function expandRecurrence(rule: RecurrenceRule, fromMs: number, toMs: number): Occurrence[] {
  if (!rule.active || rule.amount < 0 || !Number.isFinite(rule.amount)) return [];
  const out: Occurrence[] = [];
  let cursor = rule.nextDueMs;
  let n = 0;
  while (cursor < toMs && n < 500) {
    if (cursor >= fromMs) {
      out.push({ key: `${rule.id}-${n}`, ts: cursor, label: rule.label, amount: rule.amount, ruleId: rule.id });
    }
    cursor = rule.cadence === 'weekly' ? cursor + 7 * DAY_MS : addMonthsClamped(cursor, 1);
    n++;
  }
  return out;
}

export function expandRecurrings(
  rules: RecurrenceRule[],
  fromMs: number,
  toMs: number,
): Occurrence[] {
  return rules
    .flatMap((rule) => expandRecurrence(rule, fromMs, toMs))
    .sort((a, b) => a.ts - b.ts);
}

/** Mois calendaire (année, mois 0-11) → [premier ms, premier ms du mois suivant[. */
export function monthRange(year: number, monthIndex: number): { from: number; to: number } {
  return {
    from: new Date(year, monthIndex, 1).getTime(),
    to: new Date(year, monthIndex + 1, 1).getTime(),
  };
}

export interface DatedAmount {
  ts: number;
  amount: number;
  categoryId: string;
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
  count: number;
}

/** Totaux par catégorie, triés décroissants. */
export function totalsByCategory(entries: DatedAmount[]): CategoryTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const e of entries) {
    const acc = map.get(e.categoryId) ?? { total: 0, count: 0 };
    acc.total += e.amount;
    acc.count += 1;
    map.set(e.categoryId, acc);
  }
  return [...map.entries()]
    .map(([categoryId, v]) => ({ categoryId, ...v }))
    .sort((a, b) => b.total - a.total);
}

export interface PeriodTotals {
  moneyIn: number;
  moneyOut: number;
  left: number;
}

/** Entrées − sorties (carburant et courses inclus par l'appelant). */
export function periodTotals(income: number, costs: number): PeriodTotals {
  return { moneyIn: income, moneyOut: costs, left: income - costs };
}
