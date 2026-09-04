import { allocateExpenseToCategories } from "@homewallet/shared";

function assertEqual(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const parentId = "11111111-1111-1111-1111-111111111111";
const foodId = "22222222-2222-2222-2222-222222222222";
const funId = "33333333-3333-3333-3333-333333333333";

const plain = allocateExpenseToCategories({
  amount: 80,
  categoryId: foodId,
});
assert(plain.length === 1, "no lines → one slice");
assertEqual(plain[0]!.amount, 80, "plain amount");
assert(plain[0]!.categoryId === foodId, "plain category");

const detailed = allocateExpenseToCategories({
  amount: 100,
  categoryId: parentId,
  cardLines: [
    { amount: 40, categoryId: foodId },
    { amount: 25, categoryId: funId },
  ],
});
const detailedById = Object.fromEntries(
  detailed.map((slice) => [slice.categoryId, slice.amount])
);
assertEqual(detailedById[foodId]!, 40, "line food");
assertEqual(detailedById[funId]!, 25, "line fun");
assertEqual(detailedById[parentId]!, 35, "Outros on parent");
assert(detailed.length === 3, "lines + Outros");

const exact = allocateExpenseToCategories({
  amount: 70,
  categoryId: parentId,
  cardLines: [
    { amount: 40, categoryId: foodId },
    { amount: 30, categoryId: funId },
  ],
});
assert(
  exact.every((slice) => slice.categoryId !== parentId),
  "fully detailed → no Outros slice"
);
assertEqual(
  exact.reduce((sum, slice) => sum + slice.amount, 0),
  70,
  "exact cover total"
);

const merged = allocateExpenseToCategories({
  amount: 50,
  categoryId: parentId,
  cardLines: [
    { amount: 10, categoryId: foodId },
    { amount: 15, categoryId: foodId },
  ],
});
const mergedFood = merged.find((slice) => slice.categoryId === foodId);
assertEqual(mergedFood!.amount, 25, "same category lines merge");
assertEqual(
  merged.find((slice) => slice.categoryId === parentId)!.amount,
  25,
  "Outros after merge"
);

console.log("spend-allocation check ok");
