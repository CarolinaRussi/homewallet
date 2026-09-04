import type { BudgetLayer } from "@homewallet/shared";

export const DEFAULT_CATEGORY_NAMES = [
  "Salário",
  "Moradia",
  "Alimentação",
  "Transporte",
  "Saúde",
  "Lazer",
  "Assinaturas",
  "Outros",
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
};
