import {
  buildBudgetLayersFromAmounts,
  buildCategoryBreakdown,
  buildOverviewSeries,
  overviewEntryDeltas,
  overviewFlowOptionsForScope,
  overviewRangeMonths,
} from "@homewallet/shared";

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

const six = overviewRangeMonths("2026-09", "6");
assert(
  six.join(",") === "2026-04,2026-05,2026-06,2026-07,2026-08,2026-09",
  "last 6 months"
);

const ytd = overviewRangeMonths("2026-03", "ytd");
assert(ytd.join(",") === "2026-01,2026-02,2026-03", "YTD through March");

const meOpts = overviewFlowOptionsForScope("me");
assert(meOpts.includeTransfers && !meOpts.expenseOnly, "me flows");
assert(
  !overviewFlowOptionsForScope("everyone").includeTransfers,
  "everyone skips transfers"
);
assert(
  overviewFlowOptionsForScope("shared").expenseOnly,
  "shared expense-only"
);

assertEqual(
  overviewEntryDeltas("transfer_in", 50, meOpts).income,
  50,
  "me counts transfer_in"
);
assertEqual(
  overviewEntryDeltas(
    "transfer_out",
    50,
    overviewFlowOptionsForScope("everyone")
  ).expense,
  0,
  "everyone ignores transfer_out"
);
assertEqual(
  overviewEntryDeltas("income", 100, overviewFlowOptionsForScope("shared"))
    .income,
  0,
  "shared ignores income"
);

const points = buildOverviewSeries(
  ["2026-01", "2026-02", "2026-03"],
  [
    { type: "income", amount: 1000, occurredOn: "2026-01-05" },
    { type: "expense", amount: 200, occurredOn: "2026-01-10" },
    { type: "expense", amount: 300, occurredOn: "2026-02-01" },
    { type: "transfer_in", amount: 40, occurredOn: "2026-02-15" },
    { type: "saving", amount: 10, occurredOn: "2026-03-01" },
  ],
  meOpts
);

assertEqual(points[0]!.income, 1000, "jan income");
assertEqual(points[0]!.expense, 200, "jan expense");
assert(points[0]!.expenseDelta === null, "first month delta null");
assertEqual(points[1]!.income, 40, "feb transfer_in as income");
assertEqual(points[1]!.expense, 300, "feb expense");
assertEqual(points[1]!.expenseDelta!, 100, "feb expense delta");
assertEqual(points[2]!.income, 0, "mar zero income");
assertEqual(points[2]!.expense, 0, "mar zero expense (saving ignored)");
assertEqual(points[2]!.incomeDelta!, -40, "mar income delta");

const everyonePoints = buildOverviewSeries(
  ["2026-02"],
  [{ type: "transfer_out", amount: 40, occurredOn: "2026-02-15" }],
  overviewFlowOptionsForScope("everyone")
);
assertEqual(everyonePoints[0]!.expense, 0, "everyone series skips transfer");

const breakdown = buildCategoryBreakdown(
  [
    { categoryId: "a", name: "Food", amount: 100, budgetLayer: null },
    { categoryId: "b", name: "Rent", amount: 80, budgetLayer: null },
    { categoryId: "c", name: "Fun", amount: 60, budgetLayer: null },
    { categoryId: "d", name: "Transport", amount: 40, budgetLayer: null },
    { categoryId: "e", name: "Health", amount: 30, budgetLayer: null },
    { categoryId: "f", name: "Pets", amount: 20, budgetLayer: null },
    { categoryId: "a", name: "Food", amount: 10, budgetLayer: null },
  ],
  5
);
assertEqual(breakdown.totalExpense, 340, "breakdown total");
assert(breakdown.slices.length === 6, "top 5 + other");
assertEqual(breakdown.slices[0]!.amount, 110, "food merged first");
assert(breakdown.slices[5]!.isOther, "last slice is Other");
assertEqual(breakdown.slices[5]!.amount, 20, "Other = pets only");

const layers = buildBudgetLayersFromAmounts(
  [
    {
      categoryId: "a",
      name: "Rent",
      amount: 400,
      budgetLayer: "essential",
    },
    {
      categoryId: "b",
      name: "Fun",
      amount: 100,
      budgetLayer: "personal",
    },
    {
      categoryId: "c",
      name: "Mystery",
      amount: 50,
      budgetLayer: null,
    },
  ],
  1000
);
assertEqual(layers.income, 1000, "layers income");
assertEqual(layers.byLayer.essential.current, 400, "essential spent");
assertEqual(layers.byLayer.essential.target, 500, "essential 50%");
assertEqual(layers.byLayer.personal.current, 100, "personal spent");
assertEqual(layers.unmappedExpense, 50, "unmapped");

console.log("overview-series check ok");
