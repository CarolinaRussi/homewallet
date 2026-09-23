import { computeMonthSummary } from "@homewallet/shared";
import {
  mergePotsByName,
  resolveImportCategoryRemap,
} from "./history-import.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const buckets = [
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

const movements = [
  {
    id: "s",
    type: "seed" as const,
    amount: 2000,
    description: "",
    occurredOn: "2026-01-01",
    reservePotId: "src-pot",
    reservePotName: "Reserva",
  },
  {
    id: "c",
    type: "contribute" as const,
    amount: 100,
    description: "",
    occurredOn: "2026-01-01",
    reservePotId: "src-pot",
    reservePotName: "Reserva",
  },
  {
    id: "w",
    type: "withdraw" as const,
    amount: 50,
    description: "",
    occurredOn: "2026-02-01",
    reservePotId: "src-pot",
    reservePotName: "Reserva",
  },
];

const before = computeMonthSummary("2026-02", buckets, movements, [], 0, []);
const afterMove = computeMonthSummary(
  "2026-02",
  buckets,
  movements.map((movement) => ({
    ...movement,
    reservePotId: "tgt-pot",
  })),
  [],
  0,
  []
);

assert(afterMove.leftover === before.leftover, "leftover unchanged after move");
assert(
  afterMove.reserveBalance === before.reserveBalance,
  "reserve unchanged after move"
);

const resolved = resolveImportCategoryRemap(
  [
    {
      sourceCategoryId: "food",
      sourceName: "Alimentação",
      targetCategoryId: "tgt-food",
    },
    {
      sourceCategoryId: "pets",
      sourceName: "Pets",
      targetCategoryId: null,
    },
  ],
  { pets: "tgt-other" }
);
assert(resolved.remap.food === "tgt-food", "keeps auto-match");
assert(resolved.remap.pets === "tgt-other", "uses submitted unmatched pick");
assert(resolved.createNames.length === 0, "no leftover creates");

const needsCreate = resolveImportCategoryRemap(
  [
    {
      sourceCategoryId: "pets",
      sourceName: "Pets",
      targetCategoryId: null,
    },
  ],
  {}
);
assert(needsCreate.createNames[0]?.name === "Pets", "unmatched becomes create");

const pots = mergePotsByName(
  [
    { id: "src-default", name: "Reserva" },
    { id: "src-trip", name: "Viagem" },
  ],
  [{ id: "tgt-default", name: "Reserva" }]
);
assert(pots.potRemap["src-default"] === "tgt-default", "merge default pot");
assert(pots.createPots[0]?.sourceId === "src-trip", "keep extra pot");

console.log("history-import-execute check ok");
