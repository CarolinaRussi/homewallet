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
  lineDetailEnabled: z.boolean().optional().default(false),
});

export const entryCardLineInputSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive().finite(),
  categoryId: z.string().uuid(),
});

export type EntryCardLineInput = z.infer<typeof entryCardLineInputSchema>;

export const addEntryCardLineBodySchema = z.object({
  description: z.string().trim().min(1).max(200),
  amount: z.coerce.number().positive().finite(),
  categoryId: z.string().uuid(),
  /** When set (>= 2), materializes future statement lines 2..N. */
  installmentCount: z.coerce.number().int().min(2).max(120).optional(),
});

export type AddEntryCardLineBody = z.infer<typeof addEntryCardLineBodySchema>;

/** Remainder of a statement after detailed lines (cents-safe). */
export function cardOthersAmount(
  statementAmount: number,
  lineAmounts: number[]
): number {
  const statementCents = Math.round(statementAmount * 100);
  const linesCents = lineAmounts.reduce(
    (sum, amount) => sum + Math.round(amount * 100),
    0
  );
  return (statementCents - linesCents) / 100;
}

function refineCardLinesAgainstAmount(
  amount: number | undefined,
  cardLines: EntryCardLineInput[] | undefined,
  context: z.RefinementCtx,
  amountPath: (string | number)[]
) {
  if (!cardLines || cardLines.length === 0) {
    return;
  }
  if (amount == null) {
    context.addIssue({
      code: "custom",
      message: "amount is required when cardLines are set",
      path: amountPath,
    });
    return;
  }
  const others = cardOthersAmount(
    amount,
    cardLines.map((line) => line.amount)
  );
  if (others < 0) {
    context.addIssue({
      code: "custom",
      message: "cardLines sum cannot exceed amount",
      path: ["cardLines"],
    });
  }
}

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
    cardLines: z.array(entryCardLineInputSchema).max(50).optional(),
  })
  .superRefine((body, context) => {
    if (body.cardLines && body.cardLines.length > 0) {
      if (body.type !== "expense") {
        context.addIssue({
          code: "custom",
          message: "cardLines are only allowed on expenses",
          path: ["cardLines"],
        });
      }
      refineCardLinesAgainstAmount(body.amount, body.cardLines, context, [
        "amount",
      ]);
    }
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
    cardLines: z.array(entryCardLineInputSchema).max(50).optional(),
    /** Installment plan only: this parcel, or this and later. */
    installmentScope: z.enum(["one", "forward"]).optional(),
  })
  .refine((body) => {
    const keys = Object.keys(body).filter((key) => key !== "installmentScope");
    return keys.length > 0;
  }, "Provide at least one field")
  .superRefine((body, context) => {
    if (body.cardLines === undefined) {
      return;
    }
    if (body.type !== undefined && body.type !== "expense") {
      if (body.cardLines.length > 0) {
        context.addIssue({
          code: "custom",
          message: "cardLines are only allowed on expenses",
          path: ["cardLines"],
        });
      }
      return;
    }
    if (body.cardLines.length > 0 && body.amount != null) {
      refineCardLinesAgainstAmount(body.amount, body.cardLines, context, [
        "amount",
      ]);
    }
  });

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;
export type CreateEntryBody = z.infer<typeof createEntryBodySchema>;
export type UpdateEntryBody = z.infer<typeof updateEntryBodySchema>;

export type CategorySummary = {
  id: string;
  name: string;
  isDefault: boolean;
  budgetLayer: BudgetLayer | null;
  /** When true, expenses in this category can break into statement lines. */
  lineDetailEnabled: boolean;
};

export type EntryCardLineSummary = {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  sortOrder: number;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
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
  /** Detailed statement lines; empty when not used. */
  cardLines: EntryCardLineSummary[];
  /** Auto Outros = amount − sum(cardLines); null when no detail. */
  cardOthersAmount: number | null;
};
