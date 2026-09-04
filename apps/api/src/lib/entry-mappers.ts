import type { CategorySummary, EntrySummary } from "@homewallet/shared";
import { Category } from "../db/entities/category.entity.js";
import { Entry } from "../db/entities/entry.entity.js";

export function toCategorySummary(category: Category): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    isDefault: category.isDefault,
    budgetLayer: category.budgetLayer,
  };
}

export function toEntrySummary(entry: Entry): EntrySummary {
  return {
    id: entry.id,
    type: entry.type,
    amount: Number(entry.amount),
    description: entry.description,
    visibility: entry.visibility,
    occurredOn: entry.occurredOn,
    categoryId: entry.categoryId,
    categoryName: entry.category.name,
    userId: entry.userId,
    userName: entry.user?.name ?? "",
    recurringRuleId: entry.recurringRuleId,
    installmentPlanId: entry.installmentPlanId,
    installmentNumber: entry.installmentNumber,
    installmentCount: entry.installmentPlan?.installmentCount ?? null,
    reservePotId: entry.reservePotId,
    reservePotName: entry.reservePot?.name ?? null,
  };
}

export function monthBounds(month: string) {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText);
  const lastDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const start = `${yearText}-${monthText}-01`;
  const end = `${yearText}-${monthText}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
