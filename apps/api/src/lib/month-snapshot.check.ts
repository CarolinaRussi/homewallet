import type { MonthFlowBucket } from "@homewallet/shared";
import type { EntryFlowRow } from "../repositories/entry.repository.js";
import {
  buildFlowBuckets,
  computeSnapshotCore,
  computeSnapshotsThrough,
} from "../services/month-snapshot.build.js";

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

const flowEntries: EntryFlowRow[] = [
  {
    type: "income",
    amount: "1000",
    occurredOn: "2026-01-15",
    reservePotId: null,
  },
  {
    type: "expense",
    amount: "400",
    occurredOn: "2026-01-10",
    reservePotId: null,
  },
  {
    type: "saving",
    amount: "100",
    occurredOn: "2026-01-20",
    reservePotId: "pot-1",
  },
  {
    type: "income",
    amount: "500",
    occurredOn: "2026-02-05",
    reservePotId: null,
  },
  {
    type: "expense",
    amount: "200",
    occurredOn: "2026-02-12",
    reservePotId: null,
  },
  {
    type: "reserve_withdraw",
    amount: "50",
    occurredOn: "2026-02-20",
    reservePotId: "pot-1",
  },
];

const rebuiltBuckets = buildFlowBuckets(
  flowEntries,
  [],
  [
    {
      id: "seed-1",
      amount: "300",
      description: "",
      occurredOn: "2026-01-01",
      spaceId: "space",
      userId: "user",
      createdAt: new Date(),
    } as never,
  ]
);

assertEqual(rebuiltBuckets.length, 2, "bucket count");

const january = computeSnapshotCore(
  "2026-01",
  buckets,
  [],
  [{ id: "seed-1", amount: 300, description: "", occurredOn: "2026-01-01" }],
  flowEntries,
  [
    {
      id: "pot-1",
      name: "Poupancinha",
      spaceId: "space",
      userId: "user",
    } as never,
  ]
);
assertEqual(january.carriedIn, 0, "jan carriedIn");
assertEqual(january.leftover, 800, "jan leftover");
assertEqual(january.reserveBalance, 100, "jan reserve from saving");

const rows = computeSnapshotsThrough(
  "2026-01",
  "2026-02",
  buckets,
  [],
  [{ id: "seed-1", amount: 300, description: "", occurredOn: "2026-01-01" }],
  flowEntries,
  [
    {
      id: "pot-1",
      name: "Poupancinha",
      spaceId: "space",
      userId: "user",
    } as never,
  ]
);
assertEqual(rows.length, 2, "snapshot row count");
assertEqual(rows[1]!.carriedIn, 800, "feb carriedIn from chain");
assertEqual(rows[1]!.leftover, 1150, "feb leftover from chain");
assertEqual(rows[1]!.reserveBalance, 50, "feb reserve after withdraw");

console.log("month-snapshot check ok");
