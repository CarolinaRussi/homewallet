import { z } from "zod";
import type { SpaceCurrency } from "./space.js";

export const HISTORY_MOVE_DIRECTIONS = ["import", "leave_export"] as const;
export type HistoryMoveDirection = (typeof HISTORY_MOVE_DIRECTIONS)[number];

export const historyImportPreviewBodySchema = z.object({
  sourceSpaceId: z.string().uuid(),
});

export type HistoryImportPreviewBody = z.infer<
  typeof historyImportPreviewBodySchema
>;

export type HistoryImportSourceSummary = {
  id: string;
  name: string;
  currency: SpaceCurrency;
  entryCount: number;
};

export type HistoryCategoryMapRow = {
  sourceCategoryId: string;
  sourceName: string;
  targetCategoryId: string | null;
  targetName: string | null;
  matched: boolean;
};

export const HISTORY_IMPORT_WARNING_CODES = [
  "entry_date_mode_differs",
  "transfer_counterparty_missing",
] as const;
export type HistoryImportWarningCode =
  (typeof HISTORY_IMPORT_WARNING_CODES)[number];

export type HistoryImportWarning = {
  code: HistoryImportWarningCode;
  blocking: boolean;
};

export type HistoryImportPreview = {
  sourceSpaceId: string;
  targetSpaceId: string;
  sourceName: string;
  targetName: string;
  entryCount: number;
  monthFrom: string | null;
  monthTo: string | null;
  reserveBalance: number;
  recurringRuleCount: number;
  installmentPlanCount: number;
  categories: HistoryCategoryMapRow[];
  warnings: HistoryImportWarning[];
  previewToken: string;
};
