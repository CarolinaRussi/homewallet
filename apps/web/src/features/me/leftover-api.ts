import type {
  CreateReserveMovementBody,
  MonthSummary,
  ReserveMovementSummary,
} from "@homewallet/shared";
import { api } from "../../shared/lib/api";

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
