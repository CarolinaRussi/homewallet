import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { HistoryImportWarning } from "@homewallet/shared";

export const HISTORY_PREVIEW_TTL_MS = 15 * 60 * 1000;

export type HistoryPreviewClaims = {
  userId: string;
  sourceSpaceId: string;
  targetSpaceId: string;
  mapHash: string;
  exp: number;
};

export function normalizeCategoryName(name: string) {
  return name.trim().normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function mapSourceCategories(
  source: { id: string; name: string }[],
  target: { id: string; name: string }[]
) {
  const byNorm = new Map<string, { id: string; name: string }>();
  for (const category of target) {
    const key = normalizeCategoryName(category.name);
    if (!byNorm.has(key)) {
      byNorm.set(key, category);
    }
  }
  return source.map((category) => {
    const match = byNorm.get(normalizeCategoryName(category.name));
    return {
      sourceCategoryId: category.id,
      sourceName: category.name,
      targetCategoryId: match?.id ?? null,
      targetName: match?.name ?? null,
      matched: Boolean(match),
    };
  });
}

export function hashCategoryMap(
  rows: { sourceCategoryId: string; targetCategoryId: string | null }[]
) {
  const parts = [...rows]
    .sort((left, right) =>
      left.sourceCategoryId.localeCompare(right.sourceCategoryId)
    )
    .map((row) => `${row.sourceCategoryId}:${row.targetCategoryId ?? ""}`);
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function isEligibleSoloSource(input: {
  sourceSpaceId: string;
  targetSpaceId: string;
  sourceMemberCount: number;
  sourceRole: string;
  sourceCurrency: string;
  targetCurrency: string;
  alreadyImported: boolean;
}) {
  return (
    input.sourceSpaceId !== input.targetSpaceId &&
    input.sourceRole === "owner" &&
    input.sourceMemberCount === 1 &&
    input.sourceCurrency === input.targetCurrency &&
    !input.alreadyImported
  );
}

export function transferImportWarnings(
  counterparties: string[],
  targetMemberIds: ReadonlySet<string>,
  actorUserId: string
): HistoryImportWarning[] {
  const missing = counterparties.some(
    (userId) => userId !== actorUserId && !targetMemberIds.has(userId)
  );
  if (!missing) {
    return [];
  }
  return [{ code: "transfer_counterparty_missing", blocking: true }];
}

export function signHistoryPreviewToken(
  claims: Omit<HistoryPreviewClaims, "exp">,
  secret: string,
  now = Date.now()
) {
  const payload: HistoryPreviewClaims = {
    ...claims,
    exp: now + HISTORY_PREVIEW_TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyHistoryPreviewToken(
  token: string,
  secret: string,
  now = Date.now()
): HistoryPreviewClaims {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    throw new Error("Invalid or expired preview token");
  }
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid or expired preview token");
  }
  const claims = JSON.parse(
    Buffer.from(body, "base64url").toString("utf8")
  ) as HistoryPreviewClaims;
  if (
    typeof claims.userId !== "string" ||
    typeof claims.sourceSpaceId !== "string" ||
    typeof claims.targetSpaceId !== "string" ||
    typeof claims.mapHash !== "string" ||
    typeof claims.exp !== "number" ||
    claims.exp < now
  ) {
    throw new Error("Invalid or expired preview token");
  }
  return claims;
}
