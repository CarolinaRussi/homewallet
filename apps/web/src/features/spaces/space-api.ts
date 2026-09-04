import type {
  BudgetLayer,
  EntryDateMode,
  SpaceMemberSummary,
  SpaceMonthSummary,
  SpaceSummary,
  UpdateMyLimitsBody,
  UpdateSpaceBody,
} from "@homewallet/shared";
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

export function updateSpace(spaceId: string, body: UpdateSpaceBody) {
  return api<SpaceSummary>(`/spaces/${spaceId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function updateSpaceEntryDateMode(
  spaceId: string,
  entryDateMode: EntryDateMode
) {
  return updateSpace(spaceId, { entryDateMode });
}

export function updateMyLimits(spaceId: string, body: UpdateMyLimitsBody) {
  return api<SpaceSummary>(`/spaces/${spaceId}/my-limits`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function fetchSpaceMembers(spaceId: string) {
  return api<SpaceMemberSummary[]>(`/spaces/${spaceId}/members`);
}

export function promoteSpaceMember(spaceId: string, userId: string) {
  return api<SpaceMemberSummary[]>(
    `/spaces/${spaceId}/members/${userId}/promote`,
    { method: "POST" }
  );
}

export function regenerateJoinCode(spaceId: string) {
  return api<SpaceSummary>(`/spaces/${spaceId}/regenerate-join-code`, {
    method: "POST",
  });
}

export function inviteSpaceEmail(spaceId: string, email: string) {
  return api<void>(`/spaces/${spaceId}/invite-email`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function leaveSpace(spaceId: string) {
  return api<{ deleted: boolean }>(`/spaces/${spaceId}/leave`, {
    method: "POST",
  });
}

export function fetchSpaceMonth(spaceId: string, month: string) {
  return api<SpaceMonthSummary>(
    `/spaces/${spaceId}/space-month?month=${encodeURIComponent(month)}`
  );
}

export function updateCategory(
  spaceId: string,
  categoryId: string,
  body: { budgetLayer?: BudgetLayer | null; lineDetailEnabled?: boolean }
) {
  return api(`/spaces/${spaceId}/categories/${categoryId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** @deprecated prefer updateCategory */
export function updateCategoryLayer(
  spaceId: string,
  categoryId: string,
  budgetLayer: BudgetLayer | null
) {
  return updateCategory(spaceId, categoryId, { budgetLayer });
}
