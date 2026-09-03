import type { SpaceSummary } from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function fetchSpaces() {
  return api<SpaceSummary[]>("/spaces");
}

export function createSpace(body: {
  name: string;
  currency?: "BRL" | "USD" | "EUR";
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
