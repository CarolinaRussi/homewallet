import { z } from "zod";
import type {
  BudgetLayersSummary,
  MyLimitSettings,
  ProgressSnapshot,
} from "./limits.js";
import { monthQuerySchema } from "./entry.js";

export const RESERVE_MOVEMENT_TYPES = [
  "contribute",
  "withdraw",
  "seed",
] as const;
export type ReserveMovementType = (typeof RESERVE_MOVEMENT_TYPES)[number];

/** How a movement changes reserve cash; seed/contribute grow it, withdraw shrinks it. */
export function reserveBalanceDelta(type: ReserveMovementType, amount: number) {
  return type === "withdraw" ? -amount : amount;
}

export const createReserveMovementBodySchema = z.object({
  type: z.enum(RESERVE_MOVEMENT_TYPES),
  amount: z.coerce.number().positive().finite(),
  description: z.string().trim().max(200).optional().default(""),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

export type CreateReserveMovementBody = z.infer<
  typeof createReserveMovementBodySchema
>;

export type ReserveMovementSummary = {
  id: string;
  type: ReserveMovementType;
  amount: number;
  description: string;
  occurredOn: string;
};

export const createLeftoverSeedBodySchema = z.object({
  amount: z.coerce.number().positive().finite(),
  description: z.string().trim().max(200).optional().default(""),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

export type CreateLeftoverSeedBody = z.infer<
  typeof createLeftoverSeedBodySchema
>;

export type LeftoverSeedSummary = {
  id: string;
  amount: number;
  description: string;
  occurredOn: string;
};

export type MonthSummary = {
  month: string;
  income: number;
  expense: number;
  contributed: number;
  withdrawn: number;
  carriedIn: number;
  leftover: number;
  reserveBalance: number;
  movements: ReserveMovementSummary[];
  leftoverSeeds: LeftoverSeedSummary[];
  myLimits: MyLimitSettings;
  personalLimit: ProgressSnapshot | null;
  leftoverTarget: ProgressSnapshot | null;
  budgetLayers: BudgetLayersSummary | null;
};

export type MonthFlowBucket = {
  month: string;
  income: number;
  expense: number;
  contributed: number;
  withdrawn: number;
  /** One-shot opening leftover; does not count as income. */
  openingLeftover: number;
};

/** Pure leftover chain: each month’s leftover becomes next month’s carriedIn. */
export function computeMonthSummary(
  targetMonth: string,
  buckets: MonthFlowBucket[],
  movements: ReserveMovementSummary[],
  leftoverSeeds: LeftoverSeedSummary[] = []
): MonthSummary {
  monthQuerySchema.parse(targetMonth);

  const byMonth = new Map<string, MonthFlowBucket>();
  for (const bucket of buckets) {
    byMonth.set(bucket.month, {
      month: bucket.month,
      income: bucket.income,
      expense: bucket.expense,
      contributed: bucket.contributed,
      withdrawn: bucket.withdrawn,
      openingLeftover: bucket.openingLeftover,
    });
  }

  const months = [...byMonth.keys()].sort();
  const startMonth =
    months.length === 0 || targetMonth < months[0]! ? targetMonth : months[0]!;

  let carriedIn = 0;
  let leftover = 0;
  let cursor = startMonth;
  let income = 0;
  let expense = 0;
  let contributed = 0;
  let withdrawn = 0;

  while (cursor <= targetMonth) {
    const bucket = byMonth.get(cursor) ?? {
      month: cursor,
      income: 0,
      expense: 0,
      contributed: 0,
      withdrawn: 0,
      openingLeftover: 0,
    };
    leftover =
      carriedIn +
      bucket.income -
      bucket.expense -
      bucket.contributed +
      bucket.withdrawn +
      bucket.openingLeftover;

    if (cursor === targetMonth) {
      income = bucket.income;
      expense = bucket.expense;
      contributed = bucket.contributed;
      withdrawn = bucket.withdrawn;
      break;
    }

    carriedIn = leftover;
    cursor = shiftMonthKey(cursor, 1);
  }

  const monthMovements = movements
    .filter((movement) => movement.occurredOn.slice(0, 7) === targetMonth)
    .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn));

  const reserveBalance = movements
    .filter((movement) => movement.occurredOn.slice(0, 7) <= targetMonth)
    .reduce(
      (sum, movement) =>
        sum + reserveBalanceDelta(movement.type, movement.amount),
      0
    );

  return {
    month: targetMonth,
    income,
    expense,
    contributed,
    withdrawn,
    carriedIn,
    leftover,
    reserveBalance,
    movements: monthMovements,
    leftoverSeeds: leftoverSeeds
      .filter((seed) => seed.occurredOn.slice(0, 7) === targetMonth)
      .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn)),
    myLimits: {
      personalLimitEnabled: false,
      personalLimitAmount: null,
      leftoverTargetEnabled: false,
      leftoverTargetAmount: null,
    },
    personalLimit: null,
    leftoverTarget: null,
    budgetLayers: null,
  };
}

export function shiftMonthKey(month: string, delta: number) {
  const [yearText, monthText] = month.split("-");
  const date = new Date(
    Date.UTC(Number(yearText), Number(monthText) - 1 + delta, 1)
  );
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
