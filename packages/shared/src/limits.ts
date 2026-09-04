import { z } from "zod";

export const BUDGET_LAYERS = ["essential", "personal", "future"] as const;
export type BudgetLayer = (typeof BUDGET_LAYERS)[number];

export const BUDGET_LAYER_RATIOS = {
  essential: 0.5,
  personal: 0.4,
  future: 0.1,
} as const;

export type ProgressSnapshot = {
  current: number;
  target: number;
  remaining: number;
  overBy: number;
  ratio: number;
};

/** Soft progress: expense caps and leftover targets share this shape. */
export function progressToward(
  current: number,
  target: number
): ProgressSnapshot {
  return {
    current,
    target,
    remaining: Math.max(0, target - current),
    overBy: Math.max(0, current - target),
    ratio: target > 0 ? current / target : 0,
  };
}

export function layerTargets(income: number) {
  return {
    essential: income * BUDGET_LAYER_RATIOS.essential,
    personal: income * BUDGET_LAYER_RATIOS.personal,
    future: income * BUDGET_LAYER_RATIOS.future,
  };
}

export const updateMyLimitsBodySchema = z
  .object({
    personalLimitEnabled: z.boolean().optional(),
    personalLimitAmount: z.coerce
      .number()
      .positive()
      .finite()
      .nullable()
      .optional(),
    leftoverTargetEnabled: z.boolean().optional(),
    leftoverTargetAmount: z.coerce
      .number()
      .positive()
      .finite()
      .nullable()
      .optional(),
  })
  .refine(
    (body) => Object.keys(body).length > 0,
    "Provide at least one limit field"
  );

export type UpdateMyLimitsBody = z.infer<typeof updateMyLimitsBodySchema>;

export const updateCategoryBodySchema = z.object({
  budgetLayer: z.enum(BUDGET_LAYERS).nullable(),
});

export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;

export type MyLimitSettings = {
  personalLimitEnabled: boolean;
  personalLimitAmount: number | null;
  leftoverTargetEnabled: boolean;
  leftoverTargetAmount: number | null;
};

export type SpaceLimitProgress = {
  enabled: boolean;
  amount: number | null;
  sharedExpense: number;
  progress: ProgressSnapshot | null;
};

export type BudgetLayersSummary = {
  enabled: true;
  income: number;
  byLayer: {
    essential: ProgressSnapshot;
    personal: ProgressSnapshot;
    future: ProgressSnapshot;
  };
  unmappedExpense: number;
};

export type SpaceMonthSummary = {
  month: string;
  sharedExpense: number;
  spaceLimit: SpaceLimitProgress;
};
