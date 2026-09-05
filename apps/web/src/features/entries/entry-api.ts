import type {
  AddEntryCardLineBody,
  CategorySummary,
  CreateEntryBody,
  EntrySummary,
  UpdateEntryBody,
  UpdateEntryCardLineBody,
} from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function fetchCategories(spaceId: string) {
  return api<CategorySummary[]>(`/spaces/${spaceId}/categories`);
}

export function createCategory(
  spaceId: string,
  body: { name: string; lineDetailEnabled?: boolean }
) {
  return api<CategorySummary>(`/spaces/${spaceId}/categories`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchMyEntries(spaceId: string, month: string) {
  return api<EntrySummary[]>(
    `/spaces/${spaceId}/entries?month=${encodeURIComponent(month)}`
  );
}

export function fetchSharedEntries(spaceId: string, month: string) {
  return api<EntrySummary[]>(
    `/spaces/${spaceId}/entries/shared?month=${encodeURIComponent(month)}`
  );
}

export function createEntry(spaceId: string, body: CreateEntryBody) {
  return api<EntrySummary>(`/spaces/${spaceId}/entries`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateEntry(entryId: string, body: UpdateEntryBody) {
  return api<EntrySummary>(`/entries/${entryId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function addEntryCardLine(entryId: string, body: AddEntryCardLineBody) {
  return api<EntrySummary>(`/entries/${entryId}/card-lines`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateEntryCardLine(
  entryId: string,
  lineId: string,
  body: UpdateEntryCardLineBody
) {
  return api<EntrySummary>(`/entries/${entryId}/card-lines/${lineId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function removeEntryCardLine(
  entryId: string,
  lineId: string,
  scope: "one" | "forward" = "one"
) {
  const query = scope === "forward" ? "?scope=forward" : "";
  return api<EntrySummary | void>(
    `/entries/${entryId}/card-lines/${lineId}${query}`,
    {
      method: "DELETE",
    }
  );
}

export function deleteEntry(
  entryId: string,
  installmentScope: "one" | "forward" = "one"
) {
  const query =
    installmentScope === "forward" ? "?installmentScope=forward" : "";
  return api<void>(`/entries/${entryId}${query}`, { method: "DELETE" });
}
