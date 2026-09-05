import type {
  LeftoverSeedSummary,
  MonthFlowBucket,
  ReserveMovementSummary,
  ReservePotSummary,
} from "@homewallet/shared";
import { computeMonthSummary, shiftMonthKey } from "@homewallet/shared";
import type { LeftoverSeed } from "../db/entities/leftover-seed.entity.js";
import type { ReserveMovement } from "../db/entities/reserve-movement.entity.js";
import type { ReservePot } from "../db/entities/reserve-pot.entity.js";
import { monthBounds } from "../lib/entry-mappers.js";
import type { EntryFlowRow } from "../repositories/entry.repository.js";
import { buildPotSummaries } from "./reserve-pot.service.js";

export type FlowEntry = EntryFlowRow;

export type SnapshotCore = {
  month: string;
  income: number;
  expense: number;
  contributed: number;
  withdrawn: number;
  carriedIn: number;
  leftover: number;
  reserveBalance: number;
  pots: ReservePotSummary[];
};

export function monthKeyFromDate(occurredOn: string) {
  return occurredOn.slice(0, 7);
}

export function earliestMonth(...months: string[]) {
  return [...months].sort()[0]!;
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resolveThroughMonth(
  fromMonth: string,
  buckets: MonthFlowBucket[]
) {
  const latestData = buckets.reduce(
    (latest, bucket) => (bucket.month > latest ? bucket.month : latest),
    fromMonth
  );
  return earliestMonth(fromMonth, latestData, currentMonthKey());
}

export function buildFlowBuckets(
  entries: { type: string; amount: string; occurredOn: string }[],
  movements: ReserveMovement[],
  seeds: LeftoverSeed[]
): MonthFlowBucket[] {
  const byMonth = new Map<string, MonthFlowBucket>();

  function bucketFor(month: string) {
    let bucket = byMonth.get(month);
    if (!bucket) {
      bucket = {
        month,
        income: 0,
        expense: 0,
        contributed: 0,
        withdrawn: 0,
        openingLeftover: 0,
      };
      byMonth.set(month, bucket);
    }
    return bucket;
  }

  for (const entry of entries) {
    const bucket = bucketFor(monthKeyFromDate(entry.occurredOn));
    const amount = Number(entry.amount);
    if (entry.type === "income" || entry.type === "transfer_in") {
      bucket.income += amount;
    } else if (entry.type === "expense" || entry.type === "transfer_out") {
      bucket.expense += amount;
    } else if (entry.type === "saving") {
      bucket.contributed += amount;
    } else if (entry.type === "reserve_withdraw") {
      bucket.withdrawn += amount;
    }
  }

  for (const movement of movements) {
    const bucket = bucketFor(monthKeyFromDate(movement.occurredOn));
    const amount = Number(movement.amount);
    if (movement.type === "contribute") {
      bucket.contributed += amount;
    } else if (movement.type === "withdraw") {
      bucket.withdrawn += amount;
    }
  }

  for (const seed of seeds) {
    bucketFor(monthKeyFromDate(seed.occurredOn)).openingLeftover += Number(
      seed.amount
    );
  }

  return [...byMonth.values()];
}

function savingThroughTarget(entries: FlowEntry[], throughDate: string) {
  return entries.reduce((sum, entry) => {
    if (entry.occurredOn > throughDate) {
      return sum;
    }
    if (entry.type === "saving") {
      return sum + Number(entry.amount);
    }
    if (entry.type === "reserve_withdraw") {
      return sum - Number(entry.amount);
    }
    return sum;
  }, 0);
}

export function toMovementSummary(
  movement: ReserveMovement
): ReserveMovementSummary {
  return {
    id: movement.id,
    type: movement.type,
    amount: Number(movement.amount),
    description: movement.description,
    occurredOn: movement.occurredOn,
    reservePotId: movement.reservePotId,
    reservePotName: movement.reservePot?.name ?? null,
  };
}

export function toSeedSummary(seed: LeftoverSeed): LeftoverSeedSummary {
  return {
    id: seed.id,
    amount: Number(seed.amount),
    description: seed.description,
    occurredOn: seed.occurredOn,
  };
}

export function computeSnapshotCore(
  targetMonth: string,
  buckets: MonthFlowBucket[],
  movements: ReserveMovement[],
  seeds: LeftoverSeedSummary[],
  entries: FlowEntry[],
  pots: ReservePot[]
): SnapshotCore {
  const { end: monthEnd } = monthBounds(targetMonth);
  const movementSummaries = movements.map(toMovementSummary);
  const potSummaries = buildPotSummaries(pots, entries, movements, monthEnd);
  const summary = computeMonthSummary(
    targetMonth,
    buckets,
    movementSummaries,
    seeds,
    savingThroughTarget(entries, monthEnd),
    potSummaries
  );

  return {
    month: summary.month,
    income: summary.income,
    expense: summary.expense,
    contributed: summary.contributed,
    withdrawn: summary.withdrawn,
    carriedIn: summary.carriedIn,
    leftover: summary.leftover,
    reserveBalance: summary.reserveBalance,
    pots: summary.pots,
  };
}

export function computeSnapshotsThrough(
  fromMonth: string,
  throughMonth: string,
  buckets: MonthFlowBucket[],
  movements: ReserveMovement[],
  seeds: LeftoverSeedSummary[],
  entries: FlowEntry[],
  pots: ReservePot[]
): SnapshotCore[] {
  const seedSummaries = seeds;
  const rows: SnapshotCore[] = [];
  let cursor = fromMonth;

  while (cursor <= throughMonth) {
    rows.push(
      computeSnapshotCore(
        cursor,
        buckets,
        movements,
        seedSummaries,
        entries,
        pots
      )
    );
    cursor = shiftMonthKey(cursor, 1);
  }

  return rows;
}

export function snapshotEntityToCore(snapshot: {
  month: string;
  income: string;
  expense: string;
  contributed: string;
  withdrawn: string;
  carriedIn: string;
  leftover: string;
  reserveBalance: string;
  pots: ReservePotSummary[];
}): SnapshotCore {
  return {
    month: snapshot.month,
    income: Number(snapshot.income),
    expense: Number(snapshot.expense),
    contributed: Number(snapshot.contributed),
    withdrawn: Number(snapshot.withdrawn),
    carriedIn: Number(snapshot.carriedIn),
    leftover: Number(snapshot.leftover),
    reserveBalance: Number(snapshot.reserveBalance),
    pots: snapshot.pots,
  };
}
