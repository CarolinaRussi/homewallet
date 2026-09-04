import {
  cardOthersAmount,
  remainingInstallmentSchedule,
} from "@homewallet/shared";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

/** Contract: seeded syncs to sum(lines); manual keeps statement total. */
function statementAmountAfterLineAdd(
  currentAmount: number,
  cardInstallmentSeeded: boolean,
  lineAmountsIncludingNew: number[]
): number {
  if (!cardInstallmentSeeded) {
    return currentAmount;
  }
  return (
    lineAmountsIncludingNew.reduce(
      (sum, amount) => sum + Math.round(amount * 100),
      0
    ) / 100
  );
}

assert(cardOthersAmount(100, [40, 25]) === 35, "others = total - lines");
assert(cardOthersAmount(100, [100]) === 0, "exact cover");
assert(cardOthersAmount(10.1, [3.3, 3.3]) === 3.5, "cents-safe remainder");
assert(cardOthersAmount(50, []) === 50, "no lines → full others");
assert(cardOthersAmount(10, [10.01]) === -0.01, "overshoot negative");

assert(
  statementAmountAfterLineAdd(1000, false, [200, 50]) === 1000,
  "manual statement: no total bump"
);
assert(
  cardOthersAmount(1000, [200, 50]) === 750,
  "manual: Outros shrinks when lines grow"
);
assert(
  statementAmountAfterLineAdd(40, true, [40, 30]) === 70,
  "seeded statement: sync total to sum of lines"
);
assert(
  cardOthersAmount(70, [40, 30]) === 0,
  "seeded fully detailed → Outros 0"
);

const schedule = remainingInstallmentSchedule("2026-01", 1, 3);
assert(
  schedule.map((item) => `${item.number}:${item.month}`).join("|") ===
    "1:2026-01|2:2026-02|3:2026-03",
  "parcel schedule months"
);
assert(
  schedule.filter((item) => item.number > 1).length === 2,
  "future parcels only when materializing 2..N"
);

console.log("entry.card-lines check ok");
