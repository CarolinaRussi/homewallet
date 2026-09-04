import type {
  OverviewRangePreset,
  OverviewScope,
  OverviewSeriesSummary,
} from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function fetchOverviewSeries(
  spaceId: string,
  input: {
    range: OverviewRangePreset;
    scope: OverviewScope;
    memberUserId?: string;
    endMonth: string;
  }
) {
  const params = new URLSearchParams({
    range: input.range,
    scope: input.scope,
    endMonth: input.endMonth,
  });
  if (input.scope === "member" && input.memberUserId) {
    params.set("memberUserId", input.memberUserId);
  }
  return api<OverviewSeriesSummary>(
    `/spaces/${spaceId}/overview-series?${params.toString()}`
  );
}
