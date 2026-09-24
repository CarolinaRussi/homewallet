import type { EntrySummary } from "@homewallet/shared";
import {
  buildSpaceMemberCategoryMatrix,
  matrixCellKey,
} from "./space-member-category-matrix.ts";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function entry(
  partial: Partial<EntrySummary> & Pick<EntrySummary, "id">
): EntrySummary {
  return {
    type: "expense",
    amount: 0,
    description: "",
    visibility: "personal",
    occurredOn: "2026-09-01",
    categoryId: null,
    categoryName: null,
    userId: "carol",
    userName: "Carol",
    reservePotId: null,
    reservePotName: null,
    recurringRuleId: null,
    installmentPlanId: null,
    installmentNumber: null,
    installmentCount: null,
    recurringEndMonth: null,
    transferGroupId: null,
    counterpartyUserId: null,
    counterpartyName: null,
    cardLines: [],
    cardOthersAmount: null,
    ...partial,
  };
}

const twoFood = buildSpaceMemberCategoryMatrix([
  entry({
    id: "a",
    amount: 700,
    categoryId: "food",
    categoryName: "Alimentação",
    description: "Mercado",
  }),
  entry({
    id: "b",
    amount: 500,
    categoryId: "food",
    categoryName: "Alimentação",
    description: "Padaria",
  }),
]);

assert(
  twoFood.cells.get(matrixCellKey("carol", "food")) === 1200,
  "two food expenses become one cell"
);
assert(
  twoFood.lines.get(matrixCellKey("carol", "food"))?.length === 2,
  "detail keeps both"
);

const split = buildSpaceMemberCategoryMatrix([
  entry({
    id: "c",
    userId: "carol",
    amount: 200,
    categoryId: "food",
    categoryName: "Alimentação",
  }),
  entry({
    id: "d",
    userId: "alex",
    amount: 900,
    categoryId: "home",
    categoryName: "Moradia",
  }),
  entry({
    id: "e",
    type: "transfer_out",
    userId: "carol",
    amount: 50,
    categoryId: "food",
    categoryName: "Alimentação",
  }),
]);

assert(split.cells.get(matrixCellKey("carol", "food")) === 200, "carol food");
assert(split.cells.get(matrixCellKey("alex", "home")) === 900, "alex housing");
assert(split.grandTotal === 1100, "transfers do not count");

const card = buildSpaceMemberCategoryMatrix([
  entry({
    id: "f",
    amount: 1000,
    categoryId: "card",
    categoryName: "Cartão de Crédito",
    cardLines: [
      {
        id: "l1",
        description: "iFood",
        amount: 300,
        categoryId: "food",
        categoryName: "Alimentação",
        sortOrder: 0,
        installmentGroupId: null,
        installmentNumber: null,
        installmentCount: null,
        recurringGroupId: null,
      },
    ],
    cardOthersAmount: 700,
  }),
]);

assert(
  card.cells.get(matrixCellKey("carol", "food")) === 300,
  "card line to food"
);
assert(
  card.cells.get(matrixCellKey("carol", "card")) === 700,
  "card others stay on statement"
);

console.log("space-member-category-matrix check ok");
