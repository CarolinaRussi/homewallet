import type { QueryClient } from "@tanstack/react-query";
import type {
  CreateLeftoverSeedBody,
  CreateReserveMovementBody,
  LeftoverSeedSummary,
  MonthSummary,
  ReserveMovementSummary,
} from "@homewallet/shared";
import { api } from "../../shared/lib/api";

/** One immediate + one delayed refetch after async snapshot rebuild. No polling. */
export function invalidateMonthSummaryAfterWrite(
  queryClient: QueryClient,
  spaceId: string
) {
  void queryClient.invalidateQueries({ queryKey: ["month-summary", spaceId] });
  window.setTimeout(() => {
    void queryClient.invalidateQueries({
      queryKey: ["month-summary", spaceId],
    });
  }, 2000);
}

export function fetchMonthSummary(spaceId: string, month: string) {
  return api<MonthSummary>(
    `/spaces/${spaceId}/month-summary?month=${encodeURIComponent(month)}`
  );
}

export function createReserveMovement(
  spaceId: string,
  body: CreateReserveMovementBody
) {
  return api<ReserveMovementSummary>(`/spaces/${spaceId}/reserve-movements`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteReserveMovement(movementId: string) {
  return api<void>(`/reserve-movements/${movementId}`, { method: "DELETE" });
}

export function createLeftoverSeed(
  spaceId: string,
  body: CreateLeftoverSeedBody
) {
  return api<LeftoverSeedSummary>(`/spaces/${spaceId}/leftover-seeds`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteLeftoverSeed(seedId: string) {
  return api<void>(`/leftover-seeds/${seedId}`, { method: "DELETE" });
}
