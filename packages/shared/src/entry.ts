import { z } from "zod";
import type { BudgetLayer } from "./limits.js";

export const ENTRY_TYPES = [
  "income",
  "expense",
  "saving",
  "transfer_out",
  "transfer_in",
] as const;
export const CREATE_ENTRY_TYPES = [
  "income",
  "expense",
  "saving",
  "transfer",
] as const;
export const ENTRY_VISIBILITIES = ["personal", "shared"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];
export type CreateEntryType = (typeof CREATE_ENTRY_TYPES)[number];
export type EntryVisibility = (typeof ENTRY_VISIBILITIES)[number];

export const monthQuerySchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM");

export const createCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(60),
});

export const createEntryBodySchema = z
  .object({
    type: z.enum(CREATE_ENTRY_TYPES),
    amount: z.coerce.number().positive().finite(),
    categoryId: z.string().uuid().optional(),
    reservePotId: z.string().uuid().optional(),
    peerUserId: z.string().uuid().optional(),
    description: z.string().trim().max(200).optional().default(""),
    visibility: z.enum(ENTRY_VISIBILITIES).optional().default("personal"),
    occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  })
  .superRefine((body, context) => {
    if (body.type === "transfer") {
      if (!body.peerUserId) {
        context.addIssue({
          code: "custom",
          message: "peerUserId is required for transfers",
          path: ["peerUserId"],
        });
      }
      return;
    }
    if (body.type === "saving") {
      if (!body.reservePotId) {
        context.addIssue({
          code: "custom",
          message: "reservePotId is required for saving entries",
          path: ["reservePotId"],
        });
      }
      return;
    }
    if (!body.categoryId) {
      context.addIssue({
        code: "custom",
        message: "categoryId is required",
        path: ["categoryId"],
      });
    }
  });

export const updateEntryBodySchema = z
  .object({
    type: z.enum(["income", "expense", "saving"]).optional(),
    amount: z.coerce.number().positive().finite().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    reservePotId: z.string().uuid().nullable().optional(),
    description: z.string().trim().max(200).optional(),
    visibility: z.enum(ENTRY_VISIBILITIES).optional(),
    occurredOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, "Provide at least one field");

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
  categoryId: string | null;
  categoryName: string | null;
  userId: string;
  userName: string;
  reservePotId: string | null;
  reservePotName: string | null;
  recurringRuleId: string | null;
  installmentPlanId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  transferGroupId: string | null;
  counterpartyUserId: string | null;
  counterpartyName: string | null;
};
