import {
  hashCategoryMap,
  isEligibleSoloSource,
  mapSourceCategories,
  normalizeCategoryName,
  signHistoryPreviewToken,
  transferImportWarnings,
  verifyHistoryPreviewToken,
} from "./history-import.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  normalizeCategoryName("  Alimentação ") === "alimentacao",
  "normalize strips accents and case"
);

const mapped = mapSourceCategories(
  [
    { id: "src-food", name: "Alimentação" },
    { id: "src-pets", name: "Pets" },
  ],
  [
    { id: "tgt-food", name: "alimentacao" },
    { id: "tgt-other", name: "Outros" },
  ]
);
assert(mapped[0]?.matched === true, "seed name matches without accents");
assert(mapped[0]?.targetCategoryId === "tgt-food", "matched id");
assert(mapped[1]?.matched === false, "custom category stays unmatched");

assert(
  hashCategoryMap([
    { sourceCategoryId: "b", targetCategoryId: "2" },
    { sourceCategoryId: "a", targetCategoryId: null },
  ]) ===
    hashCategoryMap([
      { sourceCategoryId: "a", targetCategoryId: null },
      { sourceCategoryId: "b", targetCategoryId: "2" },
    ]),
  "map hash ignores row order"
);

assert(
  isEligibleSoloSource({
    sourceSpaceId: "solo",
    targetSpaceId: "house",
    sourceMemberCount: 1,
    sourceRole: "owner",
    sourceCurrency: "BRL",
    targetCurrency: "BRL",
    alreadyImported: false,
  }),
  "happy-path solo is eligible"
);

assert(
  !isEligibleSoloSource({
    sourceSpaceId: "solo",
    targetSpaceId: "house",
    sourceMemberCount: 2,
    sourceRole: "owner",
    sourceCurrency: "BRL",
    targetCurrency: "BRL",
    alreadyImported: false,
  }),
  "shared source is not eligible"
);

assert(
  !isEligibleSoloSource({
    sourceSpaceId: "solo",
    targetSpaceId: "house",
    sourceMemberCount: 1,
    sourceRole: "owner",
    sourceCurrency: "USD",
    targetCurrency: "BRL",
    alreadyImported: false,
  }),
  "currency mismatch is not eligible"
);

assert(
  !isEligibleSoloSource({
    sourceSpaceId: "solo",
    targetSpaceId: "house",
    sourceMemberCount: 1,
    sourceRole: "owner",
    sourceCurrency: "BRL",
    targetCurrency: "BRL",
    alreadyImported: true,
  }),
  "already imported is not eligible"
);

const warnings = transferImportWarnings(
  ["peer-left"],
  new Set(["house-mate"]),
  "me"
);
assert(
  warnings[0]?.code === "transfer_counterparty_missing" && warnings[0].blocking,
  "transfer to outsider is blocking"
);
assert(
  transferImportWarnings(["house-mate"], new Set(["house-mate"]), "me")
    .length === 0,
  "transfer to target member is fine"
);

const token = signHistoryPreviewToken(
  {
    userId: "u1",
    sourceSpaceId: "s1",
    targetSpaceId: "t1",
    mapHash: "abc",
  },
  "test-secret",
  1_000
);
const claims = verifyHistoryPreviewToken(token, "test-secret", 1_000);
assert(claims.userId === "u1", "token round-trips user");
assert(claims.exp === 1_000 + 15 * 60 * 1000, "token lasts 15 minutes");

let expired = false;
try {
  verifyHistoryPreviewToken(token, "test-secret", 1_000 + 15 * 60 * 1000 + 1);
} catch {
  expired = true;
}
assert(expired, "expired token is rejected");

console.log("history-import check ok");
