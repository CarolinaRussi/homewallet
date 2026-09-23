import {
  classifyLeaveEntry,
  isLeaveExportEligible,
  soloSpaceNameFrom,
} from "./history-leave-export.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const staying = new Set(["mate"]);

assert(
  classifyLeaveEntry(
    { type: "expense", visibility: "personal", counterpartyUserId: null },
    staying
  ).move,
  "personal expense moves"
);

assert(
  !classifyLeaveEntry(
    { type: "expense", visibility: "shared", counterpartyUserId: null },
    staying
  ).move,
  "shared expense stays"
);

assert(
  !classifyLeaveEntry(
    {
      type: "transfer_out",
      visibility: "personal",
      counterpartyUserId: "mate",
    },
    staying
  ).move,
  "transfer to staying member stays"
);

const orphan = classifyLeaveEntry(
  {
    type: "transfer_in",
    visibility: "personal",
    counterpartyUserId: "gone",
  },
  staying
);
assert(orphan.move && orphan.orphanTransfer, "orphan transfer moves with warn");

assert(isLeaveExportEligible(2), "couple can leave with data");
assert(!isLeaveExportEligible(1), "last member cannot leave-export");

assert(
  soloSpaceNameFrom("Casa").endsWith(" (pessoal)"),
  "new solo keeps a personal suffix"
);

console.log("history-leave-export check ok");
