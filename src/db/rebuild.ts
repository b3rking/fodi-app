/**
 * Reconstructing tank state from the reading log.
 *
 * The database stores readings, not a live tank. This replays them through the
 * FIFO engine to produce the tank as it stands, and hands the DB a checkpointed
 * copy on every write so a plain file copy is always a complete database.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import {
  blendedPrice,
  consume,
  emptyTank,
  isConsistent,
  levelToLitres,
  refill,
  unrecoveredFuelMoney,
  type FillLevel,
  type Tank,
} from '../core/fuel/engine';
import { listFullFills, listFuelBuys, lastReading } from './queries';
import { scheduleMirror } from '../core/backup';

export interface RebuildResult {
  tank: Tank;
  /** Km/L across completed full-tank cycles, or null if not enough data. */
  efficiency: number | null;
  /** True if the layers and the totals disagree — a real bug, not a rounding issue. */
  consistent: boolean;
  warnings: string[];
}

/**
 * Replay the fuel log from an empty tank.
 *
 * Because consumption is only knowable at the next fill, this works forward:
 * each fill adds a layer, and at the following fill we burn whatever the tank
 * level says went missing. Partial fills are exact for the same reason.
 */
export async function rebuildTank(db: SQLiteDatabase): Promise<RebuildResult> {
  const vehicle = await db.getFirstAsync<{ tank_cap_l: number; reserve_l: number }>(
    'SELECT tank_cap_l, reserve_l FROM vehicle WHERE is_default = 1 LIMIT 1;'
  );
  const capacity = vehicle?.tank_cap_l ?? 60;
  const reserve = vehicle?.reserve_l ?? 5;

  let tank = emptyTank(capacity, reserve);
  const warnings: string[] = [];

  const buys = await db.getAllAsync<{
    id: number;
    ts: string;
    station: string | null;
    volume_l: number;
    price_per_l: number;
    fee: number;
    amount: number;
    odometer_km: number;
    fill_level: FillLevel;
  }>(
    `SELECT id, ts, station, volume_l, price_per_l, fee, amount, odometer_km, fill_level
     FROM fuel_buy WHERE deleted_at IS NULL ORDER BY odometer_km ASC, ts ASC;`
  );

  if (buys.length === 0) {
    // No purchases yet: fall back to whatever the last reading said.
    const last = await lastReading(db);
    if (last && last.litres > 0) {
      tank = {
        ...tank,
        litres: last.litres,
        cost: 0,
        layers: [
          {
            id: 'unknown-start',
            litres: last.litres,
            pricePerLitre: 0,
            boughtAt: last.odometer_km.toString(),
          },
        ],
      };
      warnings.push('Fuel in the tank has no known price yet. Add a fill to fix this.');
    }
    return { tank, efficiency: null, consistent: isConsistent(tank), warnings };
  }

  let previousLevelLitres: number | null = null;

  for (let i = 0; i < buys.length; i++) {
    const buy = buys[i];
    const litresBeforeFill = tank.litres;

    const result = refill(tank, {
      id: String(buy.id),
      volumeL: buy.volume_l,
      pricePerLitre: buy.price_per_l,
      boughtAt: buy.ts,
      fee: buy.fee,
    });
    tank = result.tank;

    if (result.overfilled) {
      warnings.push(
        `The fill on ${buy.ts.slice(0, 10)} is larger than the tank allows. Check the litres.`
      );
    }

    // Burn what went missing since the previous fill, before adding this one.
    if (i > 0 && previousLevelLitres !== null) {
      const missing = litresBeforeFill - levelToLitres(buy.fill_level, capacity);
      if (missing > 0) {
        const burned = consume(tank, missing);
        tank = burned.tank;
        if (burned.shortfall) {
          warnings.push(`The tank level on ${buy.ts.slice(0, 10)} does not match the litres bought.`);
        }
      }
    }

    previousLevelLitres = levelToLitres(buy.fill_level, capacity);
  }

  const efficiency = await efficiencyAcrossCycles(db);

  return { tank, efficiency, consistent: isConsistent(tank), warnings };
}

async function efficiencyAcrossCycles(db: SQLiteDatabase): Promise<number | null> {
  const fills = await listFullFills(db);
  if (fills.length < 2) return null;

  const readings = await db.getAllAsync<{ odometer_km: number; litres: number }>(
    'SELECT odometer_km, litres FROM tank_reading WHERE deleted_at IS NULL ORDER BY odometer_km ASC, ts ASC;'
  );

  let totalKm = 0;
  let totalLitres = 0;

  for (let i = 1; i < fills.length; i++) {
    const from = fills[i - 1].odometer_km;
    const to = fills[i].odometer_km;
    const startLitres = nearestReading(readings, from, true);
    const endLitres = nearestReading(readings, to, false);
    const bought = fills[i].volume_l;
    if (startLitres === null || endLitres === null) continue;
    const litres = Math.max(0, startLitres + bought - endLitres);
    totalKm += to - from;
    totalLitres += litres;
  }

  if (totalLitres <= 0) return null;
  return totalKm / totalLitres;
}

function nearestReading(
  readings: { odometer_km: number; litres: number }[],
  odometer: number,
  atOrBefore: boolean
): number | null {
  let best: number | null = null;
  for (const r of readings) {
    if (atOrBefore ? r.odometer_km <= odometer : r.odometer_km >= odometer) {
      if (best === null || Math.abs(r.odometer_km - odometer) < Math.abs(best - odometer)) {
        best = r.litres;
      }
    }
  }
  return best;
}

/** Call after every write so the mirror file is never stale. */
export function afterWrite(db: SQLiteDatabase): void {
  scheduleMirror(db);
}

export { blendedPrice, unrecoveredFuelMoney, listFuelBuys };