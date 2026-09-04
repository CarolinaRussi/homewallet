import type { BudgetLayer } from "@homewallet/shared";
import { SAVING_CATEGORY_NAME } from "@homewallet/shared";

export const DEFAULT_CATEGORY_NAMES = [
  "Salário",
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Assinaturas",
  "Outros",
  SAVING_CATEGORY_NAME,
] as const;

/** Suggested 50/40/10 mapping for seeded categories. */
export const DEFAULT_CATEGORY_LAYERS: Record<
  (typeof DEFAULT_CATEGORY_NAMES)[number],
  BudgetLayer | null
> = {
  Salário: null,
  Moradia: "essential",
  Alimentação: "essential",
  Transporte: "essential",
  Saúde: "essential",
  Lazer: "personal",
  Assinaturas: "personal",
  Outros: null,
  [SAVING_CATEGORY_NAME]: "future",
};
