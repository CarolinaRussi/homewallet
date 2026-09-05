import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type {
  AddEntryCardLineBody,
  CreateEntryBody,
  EntrySummary,
  EntryVisibility,
  UpdateEntryBody,
  UpdateEntryCardLineBody,
} from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import {
  currentMonthValue,
  formatEntryDate,
  formatMoney,
  monthToOccurredOn,
  shiftMonth,
} from "../../shared/lib/money";
import { useActiveSpace } from "../spaces/use-active-space";
import { fetchSession } from "../auth/auth-api";
import {
  addEntryCardLine,
  createCategory,
  createEntry,
  deleteEntry,
  fetchCategories,
  fetchMyEntries,
  removeEntryCardLine,
  updateEntry,
  updateEntryCardLine,
} from "../entries/entry-api";
import { mapEntryError } from "../entries/entry-errors";
import { fetchSpaceMembers } from "../spaces/space-api";
import { ConfirmSheet } from "../../shared/ui/ConfirmSheet";
import { FeedbackBanner } from "../../shared/ui/FeedbackBanner";
import {
  ListRowsSkeleton,
  Skeleton,
  SummaryCardsSkeleton,
} from "../../shared/ui/Skeleton";
import { Spinner } from "../../shared/ui/Spinner";
import { EntryCardLinesCollapse } from "./EntryCardLinesCollapse";
import { EntryFormModal, type EntryKind } from "./EntryFormModal";
import { LeftoverReserveSection } from "./LeftoverReserveSection";
import { WelcomeSpaceModal, type WelcomeSpaceState } from "./WelcomeSpaceModal";
import { clearWelcomeIntent, peekWelcomeIntent } from "./welcome-intent";
import {
  createInstallmentPlan,
  createRecurringRule,
  deleteRecurringRule,
} from "./recurring-api";
import { fetchReservePots } from "./reserve-api";

function upsertMonthEntry(
  current: EntrySummary[] | undefined,
  entry: EntrySummary
) {
  if (!current) {
    return [entry];
  }
  const index = current.findIndex((row) => row.id === entry.id);
  if (index === -1) {
    return [entry, ...current];
  }
  return current.map((row) => (row.id === entry.id ? entry : row));
}

function entryHasFutureScope(entry: EntrySummary) {
  if (entry.installmentPlanId && entry.installmentNumber != null) {
    return (
      entry.installmentCount == null ||
      entry.installmentNumber < entry.installmentCount
    );
  }
  if (entry.recurringRuleId) {
    if (!entry.recurringEndMonth) {
      return true;
    }
    return entry.occurredOn.slice(0, 7) < entry.recurringEndMonth;
  }
  return false;
}

function readEntryBody(
  form: HTMLFormElement,
  entryDateMode: "month" | "day"
): CreateEntryBody {
  const data = new FormData(form);
  const rawDate = String(data.get("occurredOn") ?? "");
  const occurredOn =
    entryDateMode === "month" ? monthToOccurredOn(rawDate) : rawDate;
  const type = String(data.get("type"));

  if (type === "saving") {
    return {
      type: "saving",
      amount: Number(data.get("amount")),
      reservePotId: String(data.get("reservePotId")),
      description: String(data.get("description") ?? ""),
      visibility: "personal",
      occurredOn,
    };
  }

  if (type === "transfer") {
    const categoryId = String(data.get("categoryId") ?? "").trim();
    return {
      type: "transfer",
      amount: Number(data.get("amount")),
      peerUserId: String(data.get("peerUserId")),
      description: String(data.get("description") ?? ""),
      visibility: "personal",
      occurredOn,
      ...(categoryId ? { categoryId } : {}),
    };
  }

  return {
    type: type as "income" | "expense",
    amount: Number(data.get("amount")),
    categoryId: String(data.get("categoryId")),
    description: String(data.get("description") ?? ""),
    visibility: String(data.get("visibility")) as EntryVisibility,
    occurredOn,
  };
}

function readReserveWithdrawUpdateBody(
  form: HTMLFormElement,
  entryDateMode: "month" | "day"
): UpdateEntryBody {
  const data = new FormData(form);
  const rawDate = String(data.get("occurredOn") ?? "");
  const occurredOn =
    entryDateMode === "month" ? monthToOccurredOn(rawDate) : rawDate;
  return {
    amount: Number(data.get("amount")),
    reservePotId: String(data.get("reservePotId")),
    description: String(data.get("description") ?? ""),
    occurredOn,
  };
}

function readTransferUpdateBody(
  form: HTMLFormElement,
  entryDateMode: "month" | "day"
): UpdateEntryBody {
  const data = new FormData(form);
  const rawDate = String(data.get("occurredOn") ?? "");
  const occurredOn =
    entryDateMode === "month" ? monthToOccurredOn(rawDate) : rawDate;
  const categoryRaw = String(data.get("categoryId") ?? "").trim();
  return {
    amount: Number(data.get("amount")),
    description: String(data.get("description") ?? ""),
    occurredOn,
    categoryId: categoryRaw ? categoryRaw : null,
  };
}

function readEntryUpdateBody(
  form: HTMLFormElement,
  entryDateMode: "month" | "day"
): UpdateEntryBody {
  const body = readEntryBody(form, entryDateMode);
  if (body.type === "transfer") {
    throw new Error("Unexpected transfer body on entry update");
  }
  return {
    type: body.type,
    amount: body.amount,
    categoryId: body.categoryId ?? null,
    description: body.description,
    visibility: body.visibility,
    occurredOn: body.occurredOn,
  };
}

function readSharedFields(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    type: String(data.get("type")) as "income" | "expense",
    amount: Number(data.get("amount")),
    categoryId: String(data.get("categoryId")),
    description: String(data.get("description") ?? ""),
    visibility: String(data.get("visibility")) as EntryVisibility,
    startMonth: String(data.get("startMonth") ?? ""),
    endMonth: String(data.get("endMonth") ?? "").trim(),
    installmentCount: Number(data.get("installmentCount") ?? 0),
    firstInstallmentNumber: Number(data.get("firstInstallmentNumber") ?? 1),
  };
}

export function MePage() {
  const { t, locale } = useLocale();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { spacesQuery, spaces, activeSpace, spaceId, selectSpace } =
    useActiveSpace();
  const [month, setMonth] = useState(currentMonthValue);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [feedbackLeaving, setFeedbackLeaving] = useState(false);
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EntrySummary | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [deletePrompt, setDeletePrompt] = useState<EntrySummary | null>(null);
  const [editScopePrompt, setEditScopePrompt] = useState<{
    entry: EntrySummary;
    body: UpdateEntryBody;
  } | null>(null);
  const [welcome, setWelcome] = useState<WelcomeSpaceState | null>(() => {
    const intent = peekWelcomeIntent();
    if (!intent) {
      return null;
    }
    return {
      welcomeSpace: true,
      firstSpace: intent.firstSpace,
      spaceId: intent.spaceId,
    };
  });
  const feedbackClearRef = useRef<number | null>(null);
  const feedbackHideRef = useRef<number | null>(null);
  const highlightClearRef = useRef<number | null>(null);

  function dismissWelcome(destination: "me" | "home") {
    clearWelcomeIntent();
    setWelcome(null);
    navigate(destination === "home" ? "/overview" : "/me", { replace: true });
  }

  const welcomeModal =
    welcome?.spaceId != null ? (
      <WelcomeSpaceModal
        spaceId={welcome.spaceId}
        firstSpace={Boolean(welcome.firstSpace)}
        onDone={dismissWelcome}
      />
    ) : null;

  function clearFeedbackTimers() {
    if (feedbackClearRef.current !== null) {
      window.clearTimeout(feedbackClearRef.current);
      feedbackClearRef.current = null;
    }
    if (feedbackHideRef.current !== null) {
      window.clearTimeout(feedbackHideRef.current);
      feedbackHideRef.current = null;
    }
  }

  function dismissFeedback() {
    clearFeedbackTimers();
    setFeedbackLeaving(false);
    setSuccessMessage("");
    setErrorMessage("");
  }

  function scheduleFeedbackClear(clearMessage: () => void, holdMs: number) {
    clearFeedbackTimers();
    setFeedbackLeaving(false);
    feedbackClearRef.current = window.setTimeout(() => {
      setFeedbackLeaving(true);
      feedbackClearRef.current = null;
      feedbackHideRef.current = window.setTimeout(() => {
        clearMessage();
        setFeedbackLeaving(false);
        feedbackHideRef.current = null;
      }, 350);
    }, holdMs);
  }

  function showSuccess(message: string) {
    setErrorMessage("");
    setSuccessMessage(message);
    scheduleFeedbackClear(() => setSuccessMessage(""), 2200);
  }

  function showError(message: string) {
    setSuccessMessage("");
    setErrorMessage(message);
    scheduleFeedbackClear(() => setErrorMessage(""), 5000);
  }

  useEffect(() => {
    dismissFeedback();
    // Context change: stale success/error must not stick across months/spaces.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only month/space
  }, [month, spaceId]);

  function flashEntry(entryId: string) {
    setHighlightEntryId(entryId);
    if (highlightClearRef.current !== null) {
      window.clearTimeout(highlightClearRef.current);
    }
    highlightClearRef.current = window.setTimeout(() => {
      setHighlightEntryId(null);
      highlightClearRef.current = null;
    }, 1400);
  }

  useEffect(() => {
    return () => {
      if (feedbackClearRef.current !== null) {
        window.clearTimeout(feedbackClearRef.current);
      }
      if (highlightClearRef.current !== null) {
        window.clearTimeout(highlightClearRef.current);
      }
    };
  }, []);

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });
  const membersQuery = useQuery({
    queryKey: ["space-members", spaceId],
    queryFn: () => fetchSpaceMembers(spaceId!),
    enabled: Boolean(spaceId),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories", spaceId],
    queryFn: () => fetchCategories(spaceId!),
    enabled: Boolean(spaceId),
  });

  const potsQuery = useQuery({
    queryKey: ["reserve-pots", spaceId],
    queryFn: () => fetchReservePots(spaceId!),
    enabled: Boolean(spaceId),
  });

  const entriesQuery = useQuery({
    queryKey: ["entries", spaceId, month],
    queryFn: () => fetchMyEntries(spaceId!, month),
    enabled: Boolean(spaceId),
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      body,
      mode,
      entryId,
    }: {
      body: CreateEntryBody | UpdateEntryBody;
      mode: "create" | "edit";
      entryId?: string;
    }) => {
      if (!spaceId) {
        throw new Error("No space");
      }
      if (mode === "edit") {
        const id = entryId ?? editing?.id;
        if (!id) {
          throw new Error("No entry to edit");
        }
        return updateEntry(id, body as UpdateEntryBody);
      }
      return createEntry(spaceId, body as CreateEntryBody);
    },
    onSuccess: (entry, variables) => {
      closeEntryForm();
      setEditScopePrompt(null);
      showSuccess(variables.mode === "edit" ? t("me.saved") : t("me.added"));
      flashEntry(entry.id);
      if (entry.occurredOn.slice(0, 7) === month) {
        queryClient.setQueryData<EntrySummary[]>(
          ["entries", spaceId, month],
          (current) => upsertMonthEntry(current, entry)
        );
      }
      // Invalidate in background so isPending clears when the write finishes.
      void queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      void queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["reserve-pots", spaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["installment-plans", spaceId],
      });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const cardLineAddMutation = useMutation({
    mutationFn: async ({
      entryId,
      body,
    }: {
      entryId: string;
      body: AddEntryCardLineBody;
    }) => addEntryCardLine(entryId, body),
    onSuccess: (entry) => {
      showSuccess(t("me.cardStatementSaved"));
      flashEntry(entry.id);
      queryClient.setQueryData<EntrySummary[]>(
        ["entries", spaceId, month],
        (current) => upsertMonthEntry(current, entry)
      );
      void queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      void queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => {
      showError(mapEntryError(error, t));
    },
  });

  const cardLineUpdateMutation = useMutation({
    mutationFn: async ({
      entryId,
      lineId,
      body,
    }: {
      entryId: string;
      lineId: string;
      body: UpdateEntryCardLineBody;
    }) => updateEntryCardLine(entryId, lineId, body),
    onSuccess: (entry) => {
      showSuccess(t("me.cardStatementSaved"));
      flashEntry(entry.id);
      queryClient.setQueryData<EntrySummary[]>(
        ["entries", spaceId, month],
        (current) => upsertMonthEntry(current, entry)
      );
      void queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      void queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => {
      showError(mapEntryError(error, t));
    },
  });

  const cardLineRemoveMutation = useMutation({
    mutationFn: async ({
      entryId,
      lineId,
      scope,
    }: {
      entryId: string;
      lineId: string;
      scope: "one" | "forward";
    }) => removeEntryCardLine(entryId, lineId, scope),
    onSuccess: (result, variables) => {
      showSuccess(t("me.cardStatementSaved"));
      if (result && typeof result === "object" && "id" in result) {
        flashEntry(result.id);
        queryClient.setQueryData<EntrySummary[]>(
          ["entries", spaceId, month],
          (current) => upsertMonthEntry(current, result)
        );
      } else {
        flashEntry(variables.entryId);
        queryClient.setQueryData<EntrySummary[]>(
          ["entries", spaceId, month],
          (current) =>
            (current ?? []).filter((row) => row.id !== variables.entryId)
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      void queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => {
      showError(mapEntryError(error, t));
    },
  });

  const cardLineClearMutation = useMutation({
    mutationFn: async (entryId: string) =>
      updateEntry(entryId, { cardLines: [] }),
    onSuccess: (entry) => {
      showSuccess(t("me.cardStatementSaved"));
      flashEntry(entry.id);
      queryClient.setQueryData<EntrySummary[]>(
        ["entries", spaceId, month],
        (current) => upsertMonthEntry(current, entry)
      );
      void queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      void queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => {
      showError(mapEntryError(error, t));
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({
      kind,
      fields,
    }: {
      kind: "recurring" | "installment";
      fields: ReturnType<typeof readSharedFields>;
    }) => {
      if (!spaceId) {
        throw new Error("No space");
      }
      if (kind === "recurring") {
        return createRecurringRule(spaceId, {
          type: fields.type,
          amount: fields.amount,
          categoryId: fields.categoryId,
          description: fields.description,
          visibility: fields.visibility,
          startMonth: fields.startMonth,
          endMonth: fields.endMonth ? fields.endMonth : null,
        });
      }
      return createInstallmentPlan(spaceId, {
        type: fields.type,
        amount: fields.amount,
        categoryId: fields.categoryId,
        description: fields.description,
        visibility: fields.visibility,
        startMonth: fields.startMonth,
        installmentCount: fields.installmentCount,
        firstInstallmentNumber: fields.firstInstallmentNumber,
      });
    },
    onSuccess: (_result, variables) => {
      closeEntryForm();
      showSuccess(
        variables.kind === "recurring"
          ? t("me.recurringAdded")
          : t("me.installmentAdded")
      );
      void queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      void queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["recurring-rules", spaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["installment-plans", spaceId],
      });
    },
    onError: (error: Error) => {
      showError(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      entryId,
      installmentScope,
      stopRecurringRuleId,
    }: {
      entryId: string;
      installmentScope?: "one" | "forward";
      stopRecurringRuleId?: string;
    }) => {
      await deleteEntry(entryId, installmentScope ?? "one");
      if (stopRecurringRuleId) {
        await deleteRecurringRule(stopRecurringRuleId);
      }
    },
    onMutate: ({ entryId }) => setDeletingEntryId(entryId),
    onSuccess: () => {
      setDeletePrompt(null);
      showSuccess(t("me.deleted"));
      void queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      void queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["installment-plans", spaceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["recurring-rules", spaceId],
      });
    },
    onError: (error: Error) => showError(error.message),
    onSettled: () => setDeletingEntryId(null),
  });

  function closeEntryForm() {
    setFormOpen(false);
    setEditing(null);
  }

  function openCreateForm() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEditForm(entry: EntrySummary) {
    setEditing(entry);
    setFormOpen(true);
  }

  function requestDelete(entry: EntrySummary) {
    if (
      ((entry.installmentPlanId && entry.installmentNumber != null) ||
        entry.recurringRuleId) &&
      entryHasFutureScope(entry)
    ) {
      setDeletePrompt(entry);
      return;
    }
    if (entry.type === "transfer_out" || entry.type === "transfer_in") {
      setDeletePrompt(entry);
      return;
    }
    deleteMutation.mutate({ entryId: entry.id });
  }

  const categoryMutation = useMutation({
    mutationFn: (input: { name: string; lineDetailEnabled: boolean }) =>
      createCategory(spaceId!, input),
    onSuccess: async (category) => {
      showSuccess(t("me.categoryAdded"));
      queryClient.setQueryData<Awaited<ReturnType<typeof fetchCategories>>>(
        ["categories", spaceId],
        (current) => {
          if (!current) {
            return [category];
          }
          if (current.some((item) => item.id === category.id)) {
            return current;
          }
          return [...current, category];
        }
      );
      await queryClient.invalidateQueries({
        queryKey: ["categories", spaceId],
      });
    },
    onError: (error: Error) => showError(error.message),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>, entryKind: EntryKind) {
    event.preventDefault();
    if (!activeSpace) {
      return;
    }
    const form = event.currentTarget;
    if (editing) {
      if (editing.type === "transfer_out" || editing.type === "transfer_in") {
        saveMutation.mutate({
          body: readTransferUpdateBody(form, activeSpace.entryDateMode),
          mode: "edit",
        });
        return;
      }
      if (editing.type === "reserve_withdraw") {
        saveMutation.mutate({
          body: readReserveWithdrawUpdateBody(form, activeSpace.entryDateMode),
          mode: "edit",
        });
        return;
      }
      const body = readEntryUpdateBody(form, activeSpace.entryDateMode);
      if (
        ((editing.installmentPlanId && editing.installmentNumber != null) ||
          editing.recurringRuleId) &&
        entryHasFutureScope(editing)
      ) {
        setEditScopePrompt({ entry: editing, body });
        setFormOpen(false);
        return;
      }
      saveMutation.mutate({ body, mode: "edit", entryId: editing.id });
      return;
    }
    if (
      entryKind === "once" ||
      entryKind === "saving" ||
      entryKind === "transfer"
    ) {
      const body = readEntryBody(form, activeSpace.entryDateMode);
      saveMutation.mutate({ body, mode: "create" });
      return;
    }
    scheduleMutation.mutate({
      kind: entryKind,
      fields: readSharedFields(form),
    });
  }

  const formPending = saveMutation.isPending || scheduleMutation.isPending;

  if (spacesQuery.isLoading) {
    return (
      <>
        <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
          <header>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="mt-2 h-4 w-40" />
          </header>
          <SummaryCardsSkeleton />
          <ListRowsSkeleton />
        </main>
        {welcomeModal}
      </>
    );
  }

  if (!spaceId || !activeSpace) {
    return (
      <>
        <main className="px-6 py-8 md:px-10">
          <h1 className="text-3xl font-semibold text-fg">{t("me.title")}</h1>
          <p className="mt-3 text-muted">{t("me.noSpace")}</p>
        </main>
        {welcomeModal}
      </>
    );
  }

  return (
    <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-fg">{t("me.title")}</h1>
          <p className="mt-1 text-sm text-muted">{activeSpace.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {spaces.length > 1 ? (
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg"
              value={spaceId}
              onChange={(event) => selectSpace(event.target.value)}
              aria-label={t("me.activeSpace")}
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            ←
          </button>
          <span className="min-w-24 text-center text-sm font-medium text-fg">
            {month}
          </span>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            →
          </button>
        </div>
      </header>

      <LeftoverReserveSection
        spaceId={spaceId}
        month={month}
        currency={activeSpace.currency}
        entryDateMode={activeSpace.entryDateMode}
        onError={showError}
        onSuccess={showSuccess}
      />

      {successMessage || errorMessage ? (
        <FeedbackBanner
          tone={successMessage ? "success" : "error"}
          message={successMessage || errorMessage}
          leaving={feedbackLeaving}
          sticky
        />
      ) : null}

      <EntryFormModal
        key={editing?.id ?? (formOpen ? "create" : "closed")}
        open={formOpen}
        editing={editing}
        month={month}
        entryDateMode={activeSpace.entryDateMode}
        categories={categoriesQuery.data ?? []}
        pots={potsQuery.data ?? []}
        peers={(membersQuery.data ?? []).filter(
          (member) => member.userId !== sessionQuery.data?.user.id
        )}
        pending={formPending}
        creatingCategory={categoryMutation.isPending}
        onClose={closeEntryForm}
        onSubmit={onSubmit}
        onCreateCategory={(input) => categoryMutation.mutateAsync(input)}
      />

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-fg">{t("me.list")}</h2>
            {entriesQuery.isFetching && !entriesQuery.isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <Spinner />
                {t("me.updating")}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg"
            onClick={openCreateForm}
          >
            {t("me.addEntry")}
          </button>
        </div>
        {entriesQuery.isLoading ? (
          <ListRowsSkeleton />
        ) : entriesQuery.data?.length === 0 ? (
          <p className="text-sm text-muted">{t("me.empty")}</p>
        ) : null}
        {!entriesQuery.isLoading ? (
          <div
            className={`flex flex-col gap-2 transition-opacity duration-200 ${
              entriesQuery.isFetching ? "opacity-60" : "opacity-100"
            }`}
          >
            {entriesQuery.data?.map((entry) => {
              const canDetail =
                entry.type === "expense" &&
                (((categoriesQuery.data ?? []).find(
                  (category) => category.id === entry.categoryId
                )?.lineDetailEnabled ??
                  false) ||
                  entry.cardLines.length > 0);

              return (
                <article
                  key={entry.id}
                  className={[
                    "flex flex-col gap-2 rounded-lg border border-border bg-surface p-4",
                    highlightEntryId === entry.id ? "hw-entry-flash" : "",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-fg">
                        {entry.type === "transfer_out" ||
                        entry.type === "transfer_in"
                          ? entry.counterpartyName
                            ? `${
                                entry.type === "transfer_out"
                                  ? t("me.transferTo")
                                  : t("me.transferFrom")
                              } ${entry.counterpartyName}`
                            : t("me.kindTransfer")
                          : entry.type === "reserve_withdraw"
                            ? (entry.reservePotName ??
                              t("me.kindReserveWithdraw"))
                            : entry.categoryName}
                        {entry.description ? (
                          <span className="font-normal text-muted">
                            {" "}
                            · {entry.description}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-muted">
                        {formatEntryDate(
                          entry.occurredOn,
                          activeSpace.entryDateMode
                        )}{" "}
                        ·{" "}
                        {entry.type === "income"
                          ? t("me.income")
                          : entry.type === "reserve_withdraw"
                            ? t("me.kindReserveWithdraw")
                            : entry.type === "saving"
                              ? t("me.kindSaving")
                              : entry.type === "transfer_out"
                                ? t("me.transferOut")
                                : entry.type === "transfer_in"
                                  ? t("me.transferIn")
                                  : t("me.expense")}
                        {entry.type === "saving" && entry.reservePotName
                          ? ` · ${entry.reservePotName}`
                          : ""}
                        {entry.type !== "saving" &&
                        entry.type !== "reserve_withdraw" &&
                        entry.type !== "transfer_out" &&
                        entry.type !== "transfer_in"
                          ? ` · ${
                              entry.visibility === "shared"
                                ? t("me.shared")
                                : t("me.personal")
                            }`
                          : ""}
                        {entry.categoryName &&
                        (entry.type === "transfer_out" ||
                          entry.type === "transfer_in")
                          ? ` · ${entry.categoryName}`
                          : ""}
                        {entry.recurringRuleId
                          ? ` · ${t("me.recurringBadge")}`
                          : ""}
                        {entry.installmentNumber && entry.installmentCount
                          ? ` · ${entry.installmentNumber}/${entry.installmentCount}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p
                        className={`tabular-nums font-semibold ${
                          entry.type === "income" ||
                          entry.type === "transfer_in" ||
                          entry.type === "reserve_withdraw"
                            ? "text-income-fg"
                            : entry.type === "saving"
                              ? "text-accent"
                              : "text-expense-fg"
                        }`}
                      >
                        {formatMoney(
                          entry.amount,
                          activeSpace.currency,
                          locale
                        )}
                      </p>
                      <button
                        type="button"
                        className="text-sm text-muted underline disabled:opacity-70"
                        disabled={deletingEntryId === entry.id}
                        onClick={() => openEditForm(entry)}
                      >
                        {t("me.edit")}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-sm text-expense-fg underline disabled:opacity-70"
                        disabled={deletingEntryId === entry.id}
                        onClick={() => requestDelete(entry)}
                      >
                        {deletingEntryId === entry.id ? <Spinner /> : null}
                        {deletingEntryId === entry.id
                          ? t("me.deleting")
                          : t("me.delete")}
                      </button>
                    </div>
                  </div>
                  {canDetail ? (
                    <EntryCardLinesCollapse
                      entry={entry}
                      categories={categoriesQuery.data ?? []}
                      currency={activeSpace.currency}
                      pending={
                        (cardLineAddMutation.isPending &&
                          cardLineAddMutation.variables?.entryId ===
                            entry.id) ||
                        (cardLineUpdateMutation.isPending &&
                          cardLineUpdateMutation.variables?.entryId ===
                            entry.id) ||
                        (cardLineRemoveMutation.isPending &&
                          cardLineRemoveMutation.variables?.entryId ===
                            entry.id) ||
                        (cardLineClearMutation.isPending &&
                          cardLineClearMutation.variables === entry.id)
                      }
                      onAdd={(body) =>
                        cardLineAddMutation.mutateAsync({
                          entryId: entry.id,
                          body,
                        })
                      }
                      onUpdate={(lineId, body) =>
                        cardLineUpdateMutation.mutateAsync({
                          entryId: entry.id,
                          lineId,
                          body,
                        })
                      }
                      onRemoveLine={(lineId, scope) =>
                        cardLineRemoveMutation.mutateAsync({
                          entryId: entry.id,
                          lineId,
                          scope,
                        })
                      }
                      onClear={() => cardLineClearMutation.mutate(entry.id)}
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      {welcomeModal}

      {editScopePrompt ? (
        <ConfirmSheet
          open
          title={
            editScopePrompt.entry.installmentPlanId
              ? t("me.installmentEditTitle")
              : t("me.recurringEditTitle")
          }
          description={
            editScopePrompt.entry.installmentPlanId
              ? t("me.installmentEditHint").replace(
                  "{n}",
                  String(editScopePrompt.entry.installmentNumber ?? "")
                )
              : t("me.recurringEditHint")
          }
          pending={saveMutation.isPending}
          onClose={() => {
            if (!saveMutation.isPending) {
              setEditing(editScopePrompt.entry);
              setFormOpen(true);
              setEditScopePrompt(null);
            }
          }}
        >
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-fg disabled:opacity-70 sm:py-2"
            disabled={saveMutation.isPending}
            onClick={() =>
              saveMutation.mutate({
                body: {
                  ...editScopePrompt.body,
                  installmentScope: "one",
                },
                mode: "edit",
                entryId: editScopePrompt.entry.id,
              })
            }
          >
            {saveMutation.isPending ? <Spinner /> : null}
            {editScopePrompt.entry.installmentPlanId
              ? t("me.installmentEditOne")
              : t("me.recurringEditOne")}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-fg disabled:opacity-70 sm:py-2"
            disabled={saveMutation.isPending}
            onClick={() =>
              saveMutation.mutate({
                body: {
                  ...editScopePrompt.body,
                  installmentScope: "forward",
                },
                mode: "edit",
                entryId: editScopePrompt.entry.id,
              })
            }
          >
            {saveMutation.isPending ? <Spinner /> : null}
            {editScopePrompt.entry.installmentPlanId
              ? t("me.installmentEditForward")
              : t("me.recurringEditForward")}
          </button>
          <button
            type="button"
            className="rounded-md px-3 py-2.5 text-sm text-muted underline disabled:opacity-70 sm:py-2"
            disabled={saveMutation.isPending}
            onClick={() => {
              setEditing(editScopePrompt.entry);
              setFormOpen(true);
              setEditScopePrompt(null);
            }}
          >
            {t("me.cancel")}
          </button>
        </ConfirmSheet>
      ) : null}

      {deletePrompt ? (
        <ConfirmSheet
          open
          title={
            deletePrompt.installmentPlanId
              ? t("me.installmentDeleteTitle")
              : deletePrompt.type === "transfer_out" ||
                  deletePrompt.type === "transfer_in"
                ? t("me.transferDeleteTitle")
                : t("me.recurringDeleteTitle")
          }
          description={
            deletePrompt.installmentPlanId
              ? t("me.installmentDeleteHint").replace(
                  "{n}",
                  String(deletePrompt.installmentNumber ?? "")
                )
              : deletePrompt.type === "transfer_out" ||
                  deletePrompt.type === "transfer_in"
                ? t("me.transferDeleteHint")
                : t("me.recurringDeleteHint")
          }
          pending={deleteMutation.isPending}
          onClose={() => {
            if (!deleteMutation.isPending) {
              setDeletePrompt(null);
            }
          }}
        >
          {deletePrompt.type === "transfer_out" ||
          deletePrompt.type === "transfer_in" ? (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-expense px-3 py-2.5 text-sm font-medium text-expense-fg disabled:opacity-70 sm:py-2"
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteMutation.mutate({
                  entryId: deletePrompt.id,
                })
              }
            >
              {deleteMutation.isPending &&
              deletingEntryId === deletePrompt.id ? (
                <Spinner />
              ) : null}
              {t("me.delete")}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-fg disabled:opacity-70 sm:py-2"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate({
                    entryId: deletePrompt.id,
                    installmentScope: "one",
                  })
                }
              >
                {deleteMutation.isPending &&
                deletingEntryId === deletePrompt.id ? (
                  <Spinner />
                ) : null}
                {deletePrompt.installmentPlanId
                  ? t("me.installmentDeleteOne")
                  : t("me.recurringDeleteOne")}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-expense px-3 py-2.5 text-sm font-medium text-expense-fg disabled:opacity-70 sm:py-2"
                disabled={deleteMutation.isPending}
                onClick={() =>
                  deleteMutation.mutate(
                    deletePrompt.installmentPlanId
                      ? {
                          entryId: deletePrompt.id,
                          installmentScope: "forward",
                        }
                      : {
                          entryId: deletePrompt.id,
                          stopRecurringRuleId:
                            deletePrompt.recurringRuleId ?? undefined,
                        }
                  )
                }
              >
                {deleteMutation.isPending &&
                deletingEntryId === deletePrompt.id ? (
                  <Spinner />
                ) : null}
                {deletePrompt.installmentPlanId
                  ? t("me.installmentDeleteForward")
                  : t("me.recurringDeleteStop")}
              </button>
            </>
          )}
          <button
            type="button"
            className="rounded-md px-3 py-2.5 text-sm text-muted underline disabled:opacity-70 sm:py-2"
            disabled={deleteMutation.isPending}
            onClick={() => setDeletePrompt(null)}
          >
            {t("me.cancel")}
          </button>
        </ConfirmSheet>
      ) : null}
    </main>
  );
}
