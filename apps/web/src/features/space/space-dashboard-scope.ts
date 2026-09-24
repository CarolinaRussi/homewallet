import type { OverviewScope } from "@homewallet/shared";

/** Space dashboard always shows the household book. */
export function spaceDashboardScope(multiMember: boolean): OverviewScope {
  return multiMember ? "everyone" : "me";
}
