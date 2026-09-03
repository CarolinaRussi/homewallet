import type {
  CategorySummary,
  CreateEntryBody,
  EntrySummary,
  UpdateEntryBody,
} from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function fetchCategories(spaceId: string) {
  return api<CategorySummary[]>(`/spaces/${spaceId}/categories`);
}

export function createCategory(spaceId: string, name: string) {
  return api<CategorySummary>(`/spaces/${spaceId}/categories`, {
    method: "POST",
    body: JSON.stringify({ name }),
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

export function deleteEntry(entryId: string) {
  return api<void>(`/entries/${entryId}`, { method: "DELETE" });
}
