import type { EntryDateMode, SpaceSummary } from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function fetchSpaces() {
  return api<SpaceSummary[]>("/spaces");
}

export function createSpace(body: {
  name: string;
  currency?: "BRL" | "USD" | "EUR";
  entryDateMode?: EntryDateMode;
}) {
  return api<SpaceSummary>("/spaces", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function joinSpace(joinCode: string) {
  return api<SpaceSummary>("/spaces/join", {
    method: "POST",
    body: JSON.stringify({ joinCode }),
  });
}

export function updateSpaceEntryDateMode(
  spaceId: string,
  entryDateMode: EntryDateMode
) {
  return api<SpaceSummary>(`/spaces/${spaceId}`, {
    method: "PATCH",
    body: JSON.stringify({ entryDateMode }),
  });
}
