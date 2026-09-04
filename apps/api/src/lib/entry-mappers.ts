import {
  cardOthersAmount,
  type CategorySummary,
  type EntryCardLineSummary,
  type EntrySummary,
} from "@homewallet/shared";
import { Category } from "../db/entities/category.entity.js";
import { Entry } from "../db/entities/entry.entity.js";
import { EntryCardLine } from "../db/entities/entry-card-line.entity.js";

export function toCategorySummary(category: Category): CategorySummary {
  return {
    id: category.id,
    name: category.name,
    isDefault: category.isDefault,
    budgetLayer: category.budgetLayer,
    lineDetailEnabled: category.lineDetailEnabled,
  };
}

function toCardLineSummary(line: EntryCardLine): EntryCardLineSummary {
  return {
    id: line.id,
    description: line.description,
    amount: Number(line.amount),
    categoryId: line.categoryId,
    categoryName: line.category?.name ?? "",
    sortOrder: line.sortOrder,
    installmentGroupId: line.installmentGroupId,
    installmentNumber: line.installmentNumber,
    installmentCount: line.installmentCount,
  };
}

export function toEntrySummary(entry: Entry): EntrySummary {
  const cardLines = [...(entry.cardLines ?? [])]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(toCardLineSummary);
  const cardOthersAmountValue =
    cardLines.length > 0
      ? cardOthersAmount(
          Number(entry.amount),
          cardLines.map((line) => line.amount)
        )
      : null;

  return {
    id: entry.id,
    type: entry.type,
    amount: Number(entry.amount),
    description: entry.description,
    visibility: entry.visibility,
    occurredOn: entry.occurredOn,
    categoryId: entry.categoryId,
    categoryName: entry.category?.name ?? null,
    userId: entry.userId,
    userName: entry.user?.name ?? "",
    recurringRuleId: entry.recurringRuleId,
    installmentPlanId: entry.installmentPlanId,
    installmentNumber: entry.installmentNumber,
    installmentCount: entry.installmentPlan?.installmentCount ?? null,
    reservePotId: entry.reservePotId,
    reservePotName: entry.reservePot?.name ?? null,
    transferGroupId: entry.transferGroupId,
    counterpartyUserId: entry.counterpartyUserId,
    counterpartyName: entry.counterparty?.name ?? null,
    cardLines,
    cardOthersAmount: cardOthersAmountValue,
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
