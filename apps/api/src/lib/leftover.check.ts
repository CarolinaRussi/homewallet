import {
  computeMonthSummary,
  type MonthFlowBucket,
  type ReserveMovementSummary,
} from "@homewallet/shared";

function assertEqual(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

const buckets: MonthFlowBucket[] = [
  {
    month: "2026-01",
    income: 1000,
    expense: 400,
    contributed: 100,
    withdrawn: 0,
  },
  {
    month: "2026-02",
    income: 500,
    expense: 200,
    contributed: 0,
    withdrawn: 50,
  },
];

const movements: ReserveMovementSummary[] = [
  {
    id: "1",
    type: "contribute",
    amount: 100,
    description: "",
    occurredOn: "2026-01-01",
  },
  {
    id: "2",
    type: "withdraw",
    amount: 50,
    description: "",
    occurredOn: "2026-02-01",
  },
];

const january = computeMonthSummary("2026-01", buckets, movements);
assertEqual(january.carriedIn, 0, "jan carriedIn");
assertEqual(january.leftover, 500, "jan leftover"); // 0+1000-400-100+0
assertEqual(january.reserveBalance, 100, "jan reserve");

const february = computeMonthSummary("2026-02", buckets, movements);
assertEqual(february.carriedIn, 500, "feb carriedIn");
assertEqual(february.leftover, 850, "feb leftover"); // 500+500-200-0+50
assertEqual(february.reserveBalance, 50, "feb reserve");
assertEqual(february.movements.length, 1, "feb movements");

console.log("leftover check ok");
