import {
  cardOthersAmount,
  monthsThrough,
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
  "manual + normal line: no total bump"
);
assert(
  cardOthersAmount(1000, [200, 50]) === 750,
  "manual + normal line: Outros shrinks"
);
assert(
  statementAmountAfterLineAdd(40, true, [40, 30]) === 70,
  "seeded statement: sync total to sum of lines"
);
assert(
  cardOthersAmount(70, [40, 30]) === 0,
  "seeded fully detailed → Outros 0"
);

/** Installment onto manual future statement: bump total, keep Outros. */
function manualAmountAfterInstallmentParcel(
  currentAmount: number,
  parcelAmount: number
): number {
  return Math.round(currentAmount * 100 + parcelAmount * 100) / 100;
}

assert(
  manualAmountAfterInstallmentParcel(979.99, 100) === 1079.99,
  "manual future + installment: bump total"
);
assert(
  cardOthersAmount(1079.99, [200, 250, 250, 279.99, 100]) === 0,
  "after bump + parcel line, fully detailed stays Outros 0"
);
assert(
  cardOthersAmount(manualAmountAfterInstallmentParcel(1000, 50), [900, 50]) ===
    100,
  "manual future + installment: Outros preserved"
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

/** Recurring card line: ensureThrough fills start..through (same as entry recurring). */
assert(
  monthsThrough("2026-05", "2026-07").join("|") === "2026-05|2026-06|2026-07",
  "recurring card months through"
);
assert(
  monthsThrough("2026-05", "2026-07").filter((month) => month > "2026-05")
    .length === 2,
  "future recurring months only after first statement"
);

/** Edit scope: forward = this month and later; past stays put. */
function cardLineMonthsForward(startMonth: string, months: string[]): string[] {
  return months.filter((month) => month >= startMonth);
}

assert(
  cardLineMonthsForward("2026-06", ["2026-05", "2026-06", "2026-07"]).join(
    "|"
  ) === "2026-06|2026-07",
  "card line edit forward skips past months"
);
assert(
  cardLineMonthsForward("2026-06", ["2026-05", "2026-06", "2026-07"]).includes(
    "2026-05"
  ) === false,
  "card line edit one/forward never rewrites past"
);

console.log("entry.card-lines check ok");
