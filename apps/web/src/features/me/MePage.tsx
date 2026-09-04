import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  CreateEntryBody,
  EntrySummary,
  EntryType,
  EntryVisibility,
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
import {
  createCategory,
  createEntry,
  deleteEntry,
  fetchCategories,
  fetchMyEntries,
  updateEntry,
} from "../entries/entry-api";
import { Spinner } from "../../shared/ui/Spinner";
import { ConfirmSheet } from "../../shared/ui/ConfirmSheet";
import {
  ListRowsSkeleton,
  Skeleton,
  SummaryCardsSkeleton,
} from "../../shared/ui/Skeleton";
import { EntryFormModal, type EntryKind } from "./EntryFormModal";
import { LeftoverReserveSection } from "./LeftoverReserveSection";
import { WelcomeSpaceModal, type WelcomeSpaceState } from "./WelcomeSpaceModal";
import {
  createInstallmentPlan,
  createRecurringRule,
  deleteRecurringRule,
} from "./recurring-api";
import { fetchReservePots } from "./reserve-api";

function readEntryBody(
  form: HTMLFormElement,
  entryDateMode: "month" | "day"
): CreateEntryBody {
  const data = new FormData(form);
  const rawDate = String(data.get("occurredOn") ?? "");
  const occurredOn =
    entryDateMode === "month" ? monthToOccurredOn(rawDate) : rawDate;
  const type = String(data.get("type")) as EntryType;

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

  return {
    type,
    amount: Number(data.get("amount")),
    categoryId: String(data.get("categoryId")),
    description: String(data.get("description") ?? ""),
    visibility: String(data.get("visibility")) as EntryVisibility,
    occurredOn,
  };
}

function readSharedFields(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    type: String(data.get("type")) as EntryType,
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
  const location = useLocation();
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
  const [welcome, setWelcome] = useState<WelcomeSpaceState | null>(null);
  const feedbackClearRef = useRef<number | null>(null);
  const feedbackHideRef = useRef<number | null>(null);
  const highlightClearRef = useRef<number | null>(null);

  useEffect(() => {
    const state = location.state as WelcomeSpaceState | null;
    if (!state?.welcomeSpace) {
      return;
    }
    const resolvedSpaceId = state.spaceId ?? spaceId;
    if (!resolvedSpaceId) {
      return;
    }
    if (state.spaceId) {
      selectSpace(state.spaceId);
    }
    setWelcome({
      welcomeSpace: true,
      firstSpace: Boolean(state.firstSpace),
      spaceId: resolvedSpaceId,
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, selectSpace, spaceId]);

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

  function showSuccess(message: string) {
    clearFeedbackTimers();
    setErrorMessage("");
    setFeedbackLeaving(false);
    setSuccessMessage(message);
    feedbackClearRef.current = window.setTimeout(() => {
      setFeedbackLeaving(true);
      feedbackClearRef.current = null;
      feedbackHideRef.current = window.setTimeout(() => {
        setSuccessMessage("");
        setFeedbackLeaving(false);
        feedbackHideRef.current = null;
      }, 350);
    }, 2200);
  }

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
    }: {
      body: CreateEntryBody;
      mode: "create" | "edit";
    }) => {
      if (!spaceId) {
        throw new Error("No space");
      }
      if (mode === "edit" && editing) {
        return updateEntry(editing.id, body);
      }
      return createEntry(spaceId, body);
    },
    onSuccess: async (entry, variables) => {
      closeEntryForm();
      showSuccess(variables.mode === "edit" ? t("me.saved") : t("me.added"));
      flashEntry(entry.id);
      await queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["reserve-pots", spaceId],
      });
    },
    onError: (error: Error) => {
      setSuccessMessage("");
      setErrorMessage(error.message);
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
    onSuccess: async (_result, variables) => {
      closeEntryForm();
      showSuccess(
        variables.kind === "recurring"
          ? t("me.recurringAdded")
          : t("me.installmentAdded")
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries", spaceId] }),
        queryClient.invalidateQueries({ queryKey: ["month-summary", spaceId] }),
        queryClient.invalidateQueries({
          queryKey: ["recurring-rules", spaceId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["installment-plans", spaceId],
        }),
      ]);
    },
    onError: (error: Error) => {
      setSuccessMessage("");
      setErrorMessage(error.message);
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
    onSuccess: async () => {
      setDeletePrompt(null);
      showSuccess(t("me.deleted"));
      await queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["installment-plans", spaceId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["recurring-rules", spaceId],
      });
    },
    onError: (error: Error) => setErrorMessage(error.message),
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
    if (entry.installmentPlanId && entry.installmentNumber != null) {
      setDeletePrompt(entry);
      return;
    }
    if (entry.recurringRuleId) {
      setDeletePrompt(entry);
      return;
    }
    deleteMutation.mutate({ entryId: entry.id });
  }

  const categoryMutation = useMutation({
    mutationFn: (name: string) => createCategory(spaceId!, name),
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
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>, entryKind: EntryKind) {
    event.preventDefault();
    if (!activeSpace) {
      return;
    }
    const form = event.currentTarget;
    if (editing || entryKind === "once" || entryKind === "saving") {
      const body = readEntryBody(form, activeSpace.entryDateMode);
      saveMutation.mutate({ body, mode: editing ? "edit" : "create" });
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
      <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
        <header>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="mt-2 h-4 w-40" />
        </header>
        <SummaryCardsSkeleton />
        <ListRowsSkeleton />
      </main>
    );
  }

  if (!spaceId || !activeSpace) {
    return (
      <main className="px-6 py-8 md:px-10">
        <h1 className="text-3xl font-semibold text-fg">{t("me.title")}</h1>
        <p className="mt-3 text-muted">{t("me.noSpace")}</p>
      </main>
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
        onError={(message) => {
          setSuccessMessage("");
          setErrorMessage(message);
        }}
        onSuccess={showSuccess}
      />

      {successMessage || errorMessage ? (
        <p
          role="status"
          className={`sticky top-2 z-10 rounded-md border px-3 py-2 text-sm ${
            feedbackLeaving ? "hw-feedback-out" : "hw-feedback"
          } ${
            successMessage
              ? "border-accent bg-income text-income-fg"
              : "border-expense-fg/30 bg-expense text-expense-fg"
          }`}
        >
          {successMessage || errorMessage}
        </p>
      ) : null}

      <EntryFormModal
        key={editing?.id ?? (formOpen ? "create" : "closed")}
        open={formOpen}
        editing={editing}
        month={month}
        entryDateMode={activeSpace.entryDateMode}
        categories={categoriesQuery.data ?? []}
        pots={potsQuery.data ?? []}
        pending={formPending}
        creatingCategory={categoryMutation.isPending}
        onClose={closeEntryForm}
        onSubmit={onSubmit}
        onCreateCategory={(name) => categoryMutation.mutateAsync(name)}
      />

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-fg">{t("me.list")}</h2>
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
        {!entriesQuery.isLoading
          ? entriesQuery.data?.map((entry) => (
              <article
                key={entry.id}
                className={[
                  "flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between",
                  highlightEntryId === entry.id ? "hw-entry-flash" : "",
                ].join(" ")}
              >
                <div>
                  <p className="font-medium text-fg">
                    {entry.categoryName}
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
                      : entry.type === "saving"
                        ? t("me.kindSaving")
                        : t("me.expense")}
                    {entry.type === "saving" && entry.reservePotName
                      ? ` · ${entry.reservePotName}`
                      : ""}
                    {entry.type !== "saving"
                      ? ` · ${
                          entry.visibility === "shared"
                            ? t("me.shared")
                            : t("me.personal")
                        }`
                      : ""}
                    {entry.recurringRuleId
                      ? ` · ${t("me.recurringBadge")}`
                      : ""}
                    {entry.installmentNumber && entry.installmentCount
                      ? ` · ${entry.installmentNumber}/${entry.installmentCount}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className={`tabular-nums font-semibold ${
                      entry.type === "income"
                        ? "text-income-fg"
                        : entry.type === "saving"
                          ? "text-accent"
                          : "text-expense-fg"
                    }`}
                  >
                    {formatMoney(entry.amount, activeSpace.currency, locale)}
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
              </article>
            ))
          : null}
      </section>

      {welcome && spaceId ? (
        <WelcomeSpaceModal
          spaceId={welcome.spaceId || spaceId}
          firstSpace={Boolean(welcome.firstSpace)}
          onDone={(destination) => {
            setWelcome(null);
            if (destination === "home") {
              navigate("/overview");
            }
          }}
        />
      ) : null}

      {deletePrompt ? (
        <ConfirmSheet
          open
          title={
            deletePrompt.installmentPlanId
              ? t("me.installmentDeleteTitle")
              : t("me.recurringDeleteTitle")
          }
          description={
            deletePrompt.installmentPlanId
              ? t("me.installmentDeleteHint").replace(
                  "{n}",
                  String(deletePrompt.installmentNumber ?? "")
                )
              : t("me.recurringDeleteHint")
          }
          pending={deleteMutation.isPending}
          onClose={() => {
            if (!deleteMutation.isPending) {
              setDeletePrompt(null);
            }
          }}
        >
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
            {deleteMutation.isPending && deletingEntryId === deletePrompt.id ? (
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
            {deleteMutation.isPending && deletingEntryId === deletePrompt.id ? (
              <Spinner />
            ) : null}
            {deletePrompt.installmentPlanId
              ? t("me.installmentDeleteForward")
              : t("me.recurringDeleteStop")}
          </button>
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
