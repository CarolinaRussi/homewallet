import type { BudgetLayer } from "@homewallet/shared";
import { SAVING_CATEGORY_NAME } from "@homewallet/shared";

export const CREDIT_CARD_CATEGORY_NAME = "Cartão de Crédito";

export const DEFAULT_CATEGORY_NAMES = [
  "Salário",
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Assinaturas",
  CREDIT_CARD_CATEGORY_NAME,
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
  [CREDIT_CARD_CATEGORY_NAME]: "personal",
  Outros: null,
  [SAVING_CATEGORY_NAME]: "future",
};

export const DEFAULT_CATEGORY_LINE_DETAIL: Record<
  (typeof DEFAULT_CATEGORY_NAMES)[number],
  boolean
> = {
  Salário: false,
  Moradia: false,
  Alimentação: false,
  Transporte: false,
  Saúde: false,
  Lazer: false,
  Assinaturas: false,
  [CREDIT_CARD_CATEGORY_NAME]: true,
  Outros: false,
  [SAVING_CATEGORY_NAME]: false,
};
