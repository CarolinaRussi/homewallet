import {
  computeMonthSummary,
  installmentMonths,
  monthsThrough,
  recurringCoversMonth,
  remainingInstallmentSchedule,
  type MonthFlowBucket,
} from "@homewallet/shared";

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(label);
  }
}

assert(
  installmentMonths("2026-01", 3).join(",") === "2026-01,2026-02,2026-03",
  "installment months"
);

const midPlan = remainingInstallmentSchedule("2026-09", 12, 18);
assert(midPlan.length === 7, "remaining count from 12/18");
assert(
  midPlan[0]?.number === 12 && midPlan[0]?.month === "2026-09",
  "first remaining"
);
assert(
  midPlan[6]?.number === 18 && midPlan[6]?.month === "2027-03",
  "last remaining"
);

assert(recurringCoversMonth("2026-01", null, "2026-06"), "open recurring");
assert(
  !recurringCoversMonth("2026-01", "2026-03", "2026-04"),
  "ended recurring"
);
assert(
  monthsThrough("2026-01", "2026-03").join(",") === "2026-01,2026-02,2026-03",
  "months through"
);

const buckets: MonthFlowBucket[] = [
  {
    month: "2026-01",
    income: 0,
    expense: 100,
    contributed: 0,
    withdrawn: 0,
    openingLeftover: 0,
  },
  {
    month: "2026-02",
    income: 0,
    expense: 100,
    contributed: 0,
    withdrawn: 0,
    openingLeftover: 0,
  },
];
const february = computeMonthSummary("2026-02", buckets, []);
assert(february.carriedIn === -100, "carry with recurring expense");
assert(february.leftover === -200, "leftover with recurring expense");

console.log("recurring check ok");
