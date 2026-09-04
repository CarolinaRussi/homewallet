import { z } from "zod";
import type { BudgetLayer } from "./limits.js";

export const ENTRY_TYPES = ["income", "expense"] as const;
export const ENTRY_VISIBILITIES = ["personal", "shared"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type EntryVisibility = (typeof ENTRY_VISIBILITIES)[number];

export const monthQuerySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM");

export const createCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const createEntryBodySchema = z.object({
  type: z.enum(ENTRY_TYPES),
  amount: z.coerce.number().positive().finite(),
  categoryId: z.string().uuid(),
  description: z.string().trim().max(200).optional().default(""),
  visibility: z.enum(ENTRY_VISIBILITIES),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

export const updateEntryBodySchema = createEntryBodySchema.partial();

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type CreateEntryBody = z.infer<typeof createEntryBodySchema>;
export type UpdateEntryBody = z.infer<typeof updateEntryBodySchema>;

export type CategorySummary = {
  id: string;
  name: string;
  isDefault: boolean;
  budgetLayer: BudgetLayer | null;
};

export type EntrySummary = {
  id: string;
  type: EntryType;
  amount: number;
  description: string;
  visibility: EntryVisibility;
  occurredOn: string;
  categoryId: string;
  categoryName: string;
  userId: string;
  recurringRuleId: string | null;
  installmentPlanId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
};
