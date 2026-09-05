import type { OverviewScope } from "@homewallet/shared";

/** Scope for Space dashboard aggregates — mirrors Overview privacy rules. */
export function spaceDashboardScope(
  privacyMode: "private" | "transparent",
  multiMember: boolean
): OverviewScope {
  if (!multiMember) {
    return "me";
  }
  return privacyMode === "transparent" ? "everyone" : "shared";
}
