import { z } from "zod";
import type { EntryType } from "./entry.js";
import { monthQuerySchema } from "./entry.js";
import { shiftMonthKey } from "./leftover.js";
import { monthsThrough } from "./recurring.js";

export const OVERVIEW_RANGE_PRESETS = ["3", "6", "12", "ytd"] as const;
export type OverviewRangePreset = (typeof OVERVIEW_RANGE_PRESETS)[number];

export const OVERVIEW_SCOPES = ["me", "shared", "member", "everyone"] as const;
export type OverviewScope = (typeof OVERVIEW_SCOPES)[number];

export const overviewSeriesQuerySchema = z
  .object({
    range: z.enum(OVERVIEW_RANGE_PRESETS).default("6"),
    scope: z.enum(OVERVIEW_SCOPES).default("me"),
    memberUserId: z.string().uuid().optional(),
    endMonth: monthQuerySchema.optional(),
  })
  .superRefine((query, context) => {
    if (query.scope === "member" && !query.memberUserId) {
      context.addIssue({
        code: "custom",
        message: "memberUserId is required when scope is member",
        path: ["memberUserId"],
      });
    }
  });

export type OverviewSeriesQuery = z.infer<typeof overviewSeriesQuerySchema>;

export type OverviewMonthPoint = {
  month: string;
  income: number;
  expense: number;
  /** Null for the first month in the series. */
  incomeDelta: number | null;
  expenseDelta: number | null;
};

export type OverviewSeriesSummary = {
  range: OverviewRangePreset;
  scope: OverviewScope;
  memberUserId: string | null;
  endMonth: string;
  /** False for shared scope (expense-only). */
  includesIncome: boolean;
  points: OverviewMonthPoint[];
};

export const overviewBreakdownQuerySchema = z
  .object({
    month: monthQuerySchema.optional(),
    scope: z.enum(OVERVIEW_SCOPES).default("me"),
    memberUserId: z.string().uuid().optional(),
  })
  .superRefine((query, context) => {
    if (query.scope === "member" && !query.memberUserId) {
      context.addIssue({
        code: "custom",
        message: "memberUserId is required when scope is member",
        path: ["memberUserId"],
      });
    }
  });

export type OverviewBreakdownQuery = z.infer<
  typeof overviewBreakdownQuerySchema
>;

export type OverviewCategorySlice = {
  categoryId: string | null;
  name: string;
  amount: number;
  /** 0–1 of totalExpense. */
  share: number;
  isOther: boolean;
};

export type OverviewBreakdownSummary = {
  month: string;
  scope: OverviewScope;
  memberUserId: string | null;
  totalExpense: number;
  slices: OverviewCategorySlice[];
};

export type OverviewCategoryAmount = {
  categoryId: string;
  name: string;
  amount: number;
};

/** Merge amounts by category, keep Top N, roll the rest into Other. */
export function buildCategoryBreakdown(
  amounts: OverviewCategoryAmount[],
  topN = 5
): Pick<OverviewBreakdownSummary, "totalExpense" | "slices"> {
  const merged = new Map<string, { name: string; amount: number }>();
  for (const item of amounts) {
    if (item.amount <= 0) {
      continue;
    }
    const existing = merged.get(item.categoryId);
    if (existing) {
      existing.amount += item.amount;
    } else {
      merged.set(item.categoryId, {
        name: item.name,
        amount: item.amount,
      });
    }
  }

  const ranked = [...merged.entries()]
    .map(([categoryId, value]) => ({
      categoryId,
      name: value.name,
      amount: value.amount,
    }))
    .sort((left, right) => right.amount - left.amount);

  const totalExpense = ranked.reduce((sum, item) => sum + item.amount, 0);
  if (totalExpense <= 0) {
    return { totalExpense: 0, slices: [] };
  }

  const top = ranked.slice(0, topN);
  const rest = ranked.slice(topN);
  const otherAmount = rest.reduce((sum, item) => sum + item.amount, 0);

  const slices: OverviewCategorySlice[] = top.map((item) => ({
    categoryId: item.categoryId,
    name: item.name,
    amount: item.amount,
    share: item.amount / totalExpense,
    isOther: false,
  }));

  if (otherAmount > 0) {
    slices.push({
      categoryId: null,
      name: "",
      amount: otherAmount,
      share: otherAmount / totalExpense,
      isOther: true,
    });
  }

  return { totalExpense, slices };
}

/** Consecutive months ending at `endMonth` for a range preset. */
export function overviewRangeMonths(
  endMonth: string,
  range: OverviewRangePreset
): string[] {
  if (range === "ytd") {
    const year = endMonth.slice(0, 4);
    return monthsThrough(`${year}-01`, endMonth);
  }
  const monthCount = Number(range);
  const startMonth = shiftMonthKey(endMonth, -(monthCount - 1));
  return monthsThrough(startMonth, endMonth);
}

export type OverviewFlowOptions = {
  includeTransfers: boolean;
  /** When true, income and transfer_in never count. */
  expenseOnly: boolean;
};

export function overviewFlowOptionsForScope(
  scope: OverviewScope
): OverviewFlowOptions {
  if (scope === "shared") {
    return { includeTransfers: false, expenseOnly: true };
  }
  if (scope === "everyone") {
    return { includeTransfers: false, expenseOnly: false };
  }
  return { includeTransfers: true, expenseOnly: false };
}

/** Income/expense deltas for one entry under Overview rules. */
export function overviewEntryDeltas(
  type: EntryType,
  amount: number,
  options: OverviewFlowOptions
): { income: number; expense: number } {
  if (type === "saving") {
    return { income: 0, expense: 0 };
  }
  if (type === "transfer_in" || type === "transfer_out") {
    if (!options.includeTransfers) {
      return { income: 0, expense: 0 };
    }
    if (type === "transfer_in") {
      return { income: amount, expense: 0 };
    }
    return { income: 0, expense: amount };
  }
  if (type === "income") {
    if (options.expenseOnly) {
      return { income: 0, expense: 0 };
    }
    return { income: amount, expense: 0 };
  }
  if (type === "expense") {
    return { income: 0, expense: amount };
  }
  return { income: 0, expense: 0 };
}

export type OverviewSeriesEntry = {
  type: EntryType;
  amount: number;
  occurredOn: string;
};

/** Zero-filled monthly series with deltas vs the previous point. */
export function buildOverviewSeries(
  months: string[],
  entries: OverviewSeriesEntry[],
  options: OverviewFlowOptions
): OverviewMonthPoint[] {
  const totalsByMonth = new Map<string, { income: number; expense: number }>();
  for (const month of months) {
    totalsByMonth.set(month, { income: 0, expense: 0 });
  }

  for (const entry of entries) {
    const month = entry.occurredOn.slice(0, 7);
    const bucket = totalsByMonth.get(month);
    if (!bucket) {
      continue;
    }
    const deltas = overviewEntryDeltas(entry.type, entry.amount, options);
    bucket.income += deltas.income;
    bucket.expense += deltas.expense;
  }

  const points: OverviewMonthPoint[] = [];
  for (const month of months) {
    const totals = totalsByMonth.get(month)!;
    const previous = points[points.length - 1];
    points.push({
      month,
      income: totals.income,
      expense: totals.expense,
      incomeDelta: previous ? totals.income - previous.income : null,
      expenseDelta: previous ? totals.expense - previous.expense : null,
    });
  }
  return points;
}
