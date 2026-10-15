/**
 * Compte de résultat journalier — pur et partagé (Rapports, Aujourd'hui).
 * Les coûts carburant viennent de la répartition aux trajets.
 */

export interface DayTrip {
  ts: number;
  km: number;
  fare: number;
  extras: number;
  fuelCostFBu: number | null;
}

export interface DayDated {
  ts: number;
  amount: number;
}

export interface DayPnl {
  /** Clé locale AAAA-MM-JJ. */
  key: string;
  ts: number;
  km: number;
  fares: number;
  fuel: number;
  other: number;
  incomes: number;
  profit: number;
}

export function dayKeyLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function buildDailyPnl(args: {
  trips: DayTrip[];
  expenses: DayDated[];
  incomes: DayDated[];
  occurrences: DayDated[];
}): DayPnl[] {
  const map = new Map<string, DayPnl>();
  const at = (ts: number): DayPnl => {
    const key = dayKeyLocal(ts);
    let d = map.get(key);
    if (!d) {
      d = { key, ts, km: 0, fares: 0, fuel: 0, other: 0, incomes: 0, profit: 0 };
      map.set(key, d);
    }
    return d;
  };
  for (const t of args.trips) {
    const d = at(t.ts);
    d.km += t.km;
    d.fares += t.fare + t.extras;
    d.fuel += t.fuelCostFBu ?? 0;
  }
  for (const i of args.incomes) at(i.ts).incomes += i.amount;
  for (const e of args.expenses) at(e.ts).other += e.amount;
  for (const o of args.occurrences) at(o.ts).other += o.amount;
  for (const d of map.values()) d.profit = d.fares + d.incomes - d.fuel - d.other;
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}
