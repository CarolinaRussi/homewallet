import { z } from "zod";
import { ENTRY_VISIBILITIES, monthQuerySchema } from "./entry.js";
import { shiftMonthKey } from "./leftover.js";

const SCHEDULE_ENTRY_TYPES = ["income", "expense"] as const;
export type ScheduleEntryType = (typeof SCHEDULE_ENTRY_TYPES)[number];

export const createRecurringRuleBodySchema = z.object({
  type: z.enum(SCHEDULE_ENTRY_TYPES),
  amount: z.coerce.number().positive().finite(),
  categoryId: z.string().uuid(),
  description: z.string().trim().max(200).optional().default(""),
  visibility: z.enum(ENTRY_VISIBILITIES),
  startMonth: monthQuerySchema,
  endMonth: monthQuerySchema.nullable().optional().default(null),
});

export const createInstallmentPlanBodySchema = z
  .object({
    type: z.enum(SCHEDULE_ENTRY_TYPES),
    amount: z.coerce.number().positive().finite(),
    installmentCount: z.coerce.number().int().min(2).max(120),
    /** First parcel number still to pay (e.g. 12 of 18). Default 1 = full plan. */
    firstInstallmentNumber: z.coerce.number().int().min(1).max(120).default(1),
    categoryId: z.string().uuid(),
    description: z.string().trim().max(200).optional().default(""),
    visibility: z.enum(ENTRY_VISIBILITIES),
    /** Month of the first remaining installment (usually the current month). */
    startMonth: monthQuerySchema,
  })
  .refine((body) => body.firstInstallmentNumber <= body.installmentCount, {
    message: "firstInstallmentNumber must be <= installmentCount",
    path: ["firstInstallmentNumber"],
  });

export type CreateRecurringRuleBody = z.infer<
  typeof createRecurringRuleBodySchema
>;
export type CreateInstallmentPlanBody = z.infer<
  typeof createInstallmentPlanBodySchema
>;

export type RecurringRuleSummary = {
  id: string;
  type: (typeof SCHEDULE_ENTRY_TYPES)[number];
  amount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  visibility: (typeof ENTRY_VISIBILITIES)[number];
  startMonth: string;
  endMonth: string | null;
};

export type InstallmentPlanSummary = {
  id: string;
  type: (typeof SCHEDULE_ENTRY_TYPES)[number];
  amount: number;
  installmentCount: number;
  categoryId: string;
  categoryName: string;
  description: string;
  visibility: (typeof ENTRY_VISIBILITIES)[number];
  startMonth: string;
};

/** Months covered by an installment plan, 1-indexed in parallel with numbers. */
export function installmentMonths(startMonth: string, count: number): string[] {
  monthQuerySchema.parse(startMonth);
  const months: string[] = [];
  for (let index = 0; index < count; index += 1) {
    months.push(shiftMonthKey(startMonth, index));
  }
  return months;
}

/** Remaining parcels only: startMonth is when parcel `firstNumber` is due. */
export function remainingInstallmentSchedule(
  startMonth: string,
  firstInstallmentNumber: number,
  installmentCount: number
): { number: number; month: string }[] {
  monthQuerySchema.parse(startMonth);
  const remaining = installmentCount - firstInstallmentNumber + 1;
  if (remaining < 1) {
    return [];
  }
  return installmentMonths(startMonth, remaining).map((month, index) => ({
    number: firstInstallmentNumber + index,
    month,
  }));
}

export function recurringCoversMonth(
  startMonth: string,
  endMonth: string | null,
  month: string
) {
  if (month < startMonth) return false;
  if (endMonth && month > endMonth) return false;
  return true;
}

/** Every YYYY-MM from start through end inclusive. */
export function monthsThrough(startMonth: string, endMonth: string): string[] {
  if (endMonth < startMonth) return [];
  const months: string[] = [];
  let cursor = startMonth;
  while (cursor <= endMonth) {
    months.push(cursor);
    cursor = shiftMonthKey(cursor, 1);
  }
  return months;
}

export function monthToOccurredOn(month: string) {
  return `${month}-01`;
}
