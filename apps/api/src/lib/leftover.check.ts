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
    openingLeftover: 300,
  },
  {
    month: "2026-02",
    income: 500,
    expense: 200,
    contributed: 0,
    withdrawn: 50,
    openingLeftover: 0,
  },
];

const movements: ReserveMovementSummary[] = [
  {
    id: "0",
    type: "seed",
    amount: 2000,
    description: "",
    occurredOn: "2026-01-01",
    reservePotId: null,
    reservePotName: null,
  },
  {
    id: "1",
    type: "contribute",
    amount: 100,
    description: "",
    occurredOn: "2026-01-01",
    reservePotId: null,
    reservePotName: null,
  },
  {
    id: "2",
    type: "withdraw",
    amount: 50,
    description: "",
    occurredOn: "2026-02-01",
    reservePotId: null,
    reservePotName: null,
  },
];

const january = computeMonthSummary("2026-01", buckets, movements, [], 0, []);
assertEqual(january.carriedIn, 0, "jan carriedIn");
assertEqual(january.leftover, 800, "jan leftover with opening"); // 0+1000-400-100+0+300
assertEqual(january.reserveBalance, 2100, "jan reserve with seed");

const february = computeMonthSummary("2026-02", buckets, movements, [], 0, []);
assertEqual(february.carriedIn, 800, "feb carriedIn");
assertEqual(february.leftover, 1150, "feb leftover");
assertEqual(february.reserveBalance, 2050, "feb reserve");

console.log("leftover check ok");
