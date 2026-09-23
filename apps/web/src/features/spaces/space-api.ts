import type {
  BudgetLayer,
  EntryDateMode,
  HistoryImportExecuteResult,
  HistoryImportPreview,
  HistoryImportSourceSummary,
  HistoryLeaveExportExecuteResult,
  HistoryLeaveExportPreview,
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

export function fetchHistoryImportSources(targetSpaceId: string) {
  return api<HistoryImportSourceSummary[]>(
    `/spaces/${targetSpaceId}/history-import/eligible-sources`
  );
}

export function previewHistoryImport(
  targetSpaceId: string,
  sourceSpaceId: string
) {
  return api<HistoryImportPreview>(
    `/spaces/${targetSpaceId}/history-import/preview`,
    {
      method: "POST",
      body: JSON.stringify({ sourceSpaceId }),
    }
  );
}

export function executeHistoryImport(
  targetSpaceId: string,
  body: {
    sourceSpaceId: string;
    previewToken: string;
    categoryMap?: Record<string, string>;
  }
) {
  return api<HistoryImportExecuteResult>(
    `/spaces/${targetSpaceId}/history-import/execute`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export function previewLeaveExport(spaceId: string) {
  return api<HistoryLeaveExportPreview>(
    `/spaces/${spaceId}/leave-export/preview`,
    { method: "POST" }
  );
}

export function executeLeaveExport(spaceId: string, previewToken: string) {
  return api<HistoryLeaveExportExecuteResult>(
    `/spaces/${spaceId}/leave-export/execute`,
    {
      method: "POST",
      body: JSON.stringify({ previewToken }),
    }
  );
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
