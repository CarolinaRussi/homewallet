import type {
  CreateReservePotBody,
  ReservePotSummary,
  UpdateReservePotBody,
} from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function fetchReservePots(spaceId: string) {
  return api<ReservePotSummary[]>(`/spaces/${spaceId}/reserve-pots`);
}

export function createReservePot(spaceId: string, body: CreateReservePotBody) {
  return api<ReservePotSummary>(`/spaces/${spaceId}/reserve-pots`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateReservePot(potId: string, body: UpdateReservePotBody) {
  return api<ReservePotSummary>(`/reserve-pots/${potId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteReservePot(potId: string) {
  return api<void>(`/reserve-pots/${potId}`, { method: "DELETE" });
}
