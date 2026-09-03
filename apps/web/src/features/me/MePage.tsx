import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
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
  occurredOnToMonth,
  shiftMonth,
  todayIsoDate,
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
import { LeftoverReserveSection } from "./LeftoverReserveSection";

function readEntryBody(
  form: HTMLFormElement,
  entryDateMode: "month" | "day"
): CreateEntryBody {
  const data = new FormData(form);
  const rawDate = String(data.get("occurredOn") ?? "");
  const occurredOn =
    entryDateMode === "month" ? monthToOccurredOn(rawDate) : rawDate;

  return {
    type: String(data.get("type")) as EntryType,
    amount: Number(data.get("amount")),
    categoryId: String(data.get("categoryId")),
    description: String(data.get("description") ?? ""),
    visibility: String(data.get("visibility")) as EntryVisibility,
    occurredOn,
  };
}

export function MePage() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const { spaces, activeSpace, spaceId, selectSpace } = useActiveSpace();
  const [month, setMonth] = useState(currentMonthValue);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [feedbackLeaving, setFeedbackLeaving] = useState(false);
  const [highlightEntryId, setHighlightEntryId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EntrySummary | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const feedbackClearRef = useRef<number | null>(null);
  const feedbackHideRef = useRef<number | null>(null);
  const highlightClearRef = useRef<number | null>(null);

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
      setEditing(null);
      showSuccess(variables.mode === "edit" ? t("me.saved") : t("me.added"));
      flashEntry(entry.id);
      await queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => {
      setSuccessMessage("");
      setErrorMessage(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEntry,
    onMutate: (entryId) => setDeletingEntryId(entryId),
    onSuccess: async () => {
      showSuccess(t("me.deleted"));
      await queryClient.invalidateQueries({ queryKey: ["entries", spaceId] });
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => setErrorMessage(error.message),
    onSettled: () => setDeletingEntryId(null),
  });

  const categoryMutation = useMutation({
    mutationFn: (name: string) => createCategory(spaceId!, name),
    onSuccess: async () => {
      showSuccess(t("me.categoryAdded"));
      await queryClient.invalidateQueries({
        queryKey: ["categories", spaceId],
      });
    },
    onError: (error: Error) => setErrorMessage(error.message),
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeSpace) {
      return;
    }
    const form = event.currentTarget;
    const body = readEntryBody(form, activeSpace.entryDateMode);
    const mode = editing ? "edit" : "create";
    saveMutation.mutate({ body, mode });
    if (!editing) {
      form.reset();
    }
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

      <form
        key={editing?.id ?? "new"}
        className="grid max-w-xl gap-3 rounded-lg border border-border bg-surface p-4"
        onSubmit={onSubmit}
      >
        <h2 className="font-medium text-fg">
          {editing ? t("me.editEntry") : t("me.addEntry")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-muted">
            {t("me.type")}
            <select
              name="type"
              required
              defaultValue={editing?.type ?? "expense"}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
            >
              <option value="income">{t("me.income")}</option>
              <option value="expense">{t("me.expense")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            {t("me.amount")}
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={editing?.amount}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            {t("me.category")}
            <select
              name="categoryId"
              required
              defaultValue={editing?.categoryId}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
            >
              {categoriesQuery.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            {activeSpace.entryDateMode === "month"
              ? t("me.month")
              : t("me.date")}
            {activeSpace.entryDateMode === "month" ? (
              <input
                name="occurredOn"
                type="month"
                required
                defaultValue={
                  editing ? occurredOnToMonth(editing.occurredOn) : month
                }
                className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              />
            ) : (
              <input
                name="occurredOn"
                type="date"
                required
                defaultValue={editing?.occurredOn ?? todayIsoDate()}
                className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
              />
            )}
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
            {t("me.visibility")}
            <select
              name="visibility"
              required
              defaultValue={editing?.visibility ?? "personal"}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
            >
              <option value="personal">{t("me.personal")}</option>
              <option value="shared">{t("me.shared")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted sm:col-span-2">
            {t("me.description")}
            <input
              name="description"
              defaultValue={editing?.description}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 font-medium text-accent-fg disabled:opacity-70"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Spinner /> : null}
            {saveMutation.isPending
              ? t("me.saving")
              : editing
                ? t("me.save")
                : t("me.add")}
          </button>
          {editing ? (
            <button
              type="button"
              className="rounded-md border border-border px-3 py-2 text-fg disabled:opacity-70"
              disabled={saveMutation.isPending}
              onClick={() => setEditing(null)}
            >
              {t("me.cancel")}
            </button>
          ) : null}
        </div>
      </form>

      <form
        className="flex max-w-xl flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get("name") ?? "").trim();
          if (name) {
            categoryMutation.mutate(name);
            event.currentTarget.reset();
          }
        }}
      >
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm text-muted">
          {t("me.newCategory")}
          <input
            name="name"
            required
            className="rounded-md border border-border bg-surface px-3 py-2 text-fg"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-fg disabled:opacity-70"
          disabled={categoryMutation.isPending}
        >
          {categoryMutation.isPending ? <Spinner /> : null}
          {categoryMutation.isPending
            ? t("me.addingCategory")
            : t("me.addCategory")}
        </button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="font-medium text-fg">{t("me.list")}</h2>
        {entriesQuery.data?.length === 0 ? (
          <p className="text-sm text-muted">{t("me.empty")}</p>
        ) : null}
        {entriesQuery.data?.map((entry) => (
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
                {formatEntryDate(entry.occurredOn, activeSpace.entryDateMode)} ·{" "}
                {entry.type === "income" ? t("me.income") : t("me.expense")} ·{" "}
                {entry.visibility === "shared"
                  ? t("me.shared")
                  : t("me.personal")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p
                className={`tabular-nums font-semibold ${
                  entry.type === "income" ? "text-income-fg" : "text-expense-fg"
                }`}
              >
                {formatMoney(entry.amount, activeSpace.currency, locale)}
              </p>
              <button
                type="button"
                className="text-sm text-muted underline disabled:opacity-70"
                disabled={deletingEntryId === entry.id}
                onClick={() => setEditing(entry)}
              >
                {t("me.edit")}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-sm text-expense-fg underline disabled:opacity-70"
                disabled={deletingEntryId === entry.id}
                onClick={() => deleteMutation.mutate(entry.id)}
              >
                {deletingEntryId === entry.id ? <Spinner /> : null}
                {deletingEntryId === entry.id
                  ? t("me.deleting")
                  : t("me.delete")}
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
