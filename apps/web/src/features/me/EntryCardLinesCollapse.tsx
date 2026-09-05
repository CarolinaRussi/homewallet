import { useState } from "react";
import type { FormEvent } from "react";
import type {
  AddEntryCardLineBody,
  CategorySummary,
  EntryCardLineSummary,
  EntrySummary,
  UpdateEntryCardLineBody,
} from "@homewallet/shared";
import { SAVING_CATEGORY_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";
import { ConfirmSheet } from "../../shared/ui/ConfirmSheet";
import { Spinner } from "../../shared/ui/Spinner";

type ScheduleKind = "once" | "installments" | "recurring";

type EntryCardLinesCollapseProps = {
  entry: EntrySummary;
  categories: CategorySummary[];
  currency: string;
  pending: boolean;
  onAdd: (body: AddEntryCardLineBody) => Promise<unknown>;
  onUpdate: (lineId: string, body: UpdateEntryCardLineBody) => Promise<unknown>;
  onRemoveLine: (lineId: string) => void;
  onClear: () => void;
};

function hasCardLineForwardScope(line: EntryCardLineSummary) {
  if (
    line.installmentGroupId &&
    line.installmentNumber != null &&
    line.installmentCount != null
  ) {
    return line.installmentNumber < line.installmentCount;
  }
  return Boolean(line.recurringGroupId);
}

export function EntryCardLinesCollapse({
  entry,
  categories,
  currency,
  pending,
  onAdd,
  onUpdate,
  onRemoveLine,
  onClear,
}: EntryCardLinesCollapseProps) {
  const { t, locale } = useLocale();
  const [adding, setAdding] = useState(false);
  const [editingLine, setEditingLine] = useState<EntryCardLineSummary | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [scheduleKind, setScheduleKind] = useState<ScheduleKind>("once");
  const [installmentCount, setInstallmentCount] = useState("");
  const [editScopePrompt, setEditScopePrompt] = useState<{
    line: EntryCardLineSummary;
    body: Omit<UpdateEntryCardLineBody, "scope">;
  } | null>(null);

  const ledgerCategories = categories.filter(
    (category) => category.name !== SAVING_CATEGORY_NAME
  );

  const lineCount = entry.cardLines.length;
  const remainingOthers =
    entry.cardOthersAmount != null
      ? entry.cardOthersAmount
      : Math.round(
          (entry.amount -
            entry.cardLines.reduce((sum, line) => sum + line.amount, 0)) *
            100
        ) / 100;
  const summaryLabel =
    lineCount > 0
      ? t("me.cardCollapseOpen").replace("{n}", String(lineCount))
      : t("me.cardDetailStatement");

  function resetForms() {
    setAdding(false);
    setEditingLine(null);
    setDescription("");
    setAmount(0);
    setCategoryId("");
    setScheduleKind("once");
    setInstallmentCount("");
  }

  function startEdit(line: EntryCardLineSummary) {
    setAdding(false);
    setEditingLine(line);
    setDescription(line.description);
    setAmount(line.amount);
    setCategoryId(line.categoryId);
  }

  async function submitAdd(event: FormEvent) {
    event.preventDefault();
    if (!description.trim() || amount <= 0 || !categoryId) {
      return;
    }
    const body: AddEntryCardLineBody = {
      description: description.trim(),
      amount,
      categoryId,
    };
    if (scheduleKind === "recurring") {
      body.recurring = true;
    } else if (scheduleKind === "installments") {
      const parcels = Number(installmentCount);
      if (!Number.isInteger(parcels) || parcels < 2) {
        return;
      }
      body.installmentCount = parcels;
    }
    try {
      await onAdd(body);
      resetForms();
    } catch {
      // keep form open; parent shows the error
    }
  }

  async function submitEdit(event: FormEvent) {
    event.preventDefault();
    if (!editingLine || !description.trim() || amount <= 0 || !categoryId) {
      return;
    }
    const body = {
      description: description.trim(),
      amount,
      categoryId,
    };
    if (hasCardLineForwardScope(editingLine)) {
      setEditScopePrompt({ line: editingLine, body });
      return;
    }
    try {
      await onUpdate(editingLine.id, { ...body, scope: "one" });
      resetForms();
    } catch {
      // keep form open
    }
  }

  async function applyEditScope(scope: "one" | "forward") {
    if (!editScopePrompt) {
      return;
    }
    try {
      await onUpdate(editScopePrompt.line.id, {
        ...editScopePrompt.body,
        scope,
      });
      setEditScopePrompt(null);
      resetForms();
    } catch {
      // keep prompt open
    }
  }

  const formBusy = pending;

  return (
    <details className="rounded-md border border-dashed border-border px-3 py-2 text-sm">
      <summary className="cursor-pointer text-muted">{summaryLabel}</summary>

      {lineCount > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5 border-t border-border/60 pt-2">
          {entry.cardLines.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
            >
              <span className="text-fg">
                <span className="text-muted">{line.categoryName}</span>
                {line.description ? (
                  <span className="text-muted"> · {line.description}</span>
                ) : null}
                {line.installmentNumber != null &&
                line.installmentCount != null ? (
                  <span className="text-muted">
                    {" "}
                    · {line.installmentNumber}/{line.installmentCount}
                  </span>
                ) : null}
                {line.recurringGroupId ? (
                  <span className="text-muted">
                    {" "}
                    · {t("me.cardLineRecurringBadge")}
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-expense-fg">
                  {formatMoney(line.amount, currency, locale)}
                </span>
                <button
                  type="button"
                  className="text-xs text-muted underline disabled:opacity-70"
                  disabled={formBusy || editingLine?.id === line.id}
                  onClick={() => startEdit(line)}
                >
                  {t("me.cardLineEdit")}
                </button>
                <button
                  type="button"
                  className="text-xs text-muted underline disabled:opacity-70"
                  disabled={formBusy}
                  onClick={() => onRemoveLine(line.id)}
                  title={
                    line.recurringGroupId || line.installmentGroupId
                      ? t("me.cardLineRecurringRemoveHint")
                      : undefined
                  }
                >
                  {t("me.cardLineRemove")}
                </button>
              </span>
            </li>
          ))}
          {entry.cardOthersAmount != null && entry.cardOthersAmount > 0 ? (
            <li className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-muted">
              <span>{t("me.cardOthers")}</span>
              <span className="tabular-nums">
                {formatMoney(entry.cardOthersAmount, currency, locale)}
              </span>
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted">{t("me.cardDetailHint")}</p>
      )}

      {editingLine ? (
        <form
          className="mt-3 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-[minmax(0,1.2fr)_6.5rem_minmax(0,1fr)_auto] sm:items-end"
          onSubmit={submitEdit}
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.description")}
            <input
              value={description}
              disabled={formBusy}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg"
              required
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.amount")}
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount || ""}
              disabled={formBusy}
              onChange={(event) => setAmount(Number(event.target.value) || 0)}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg tabular-nums"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.category")}
            <select
              value={categoryId}
              disabled={formBusy}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg"
              required
            >
              {ledgerCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm text-fg disabled:opacity-70"
              disabled={formBusy || ledgerCategories.length === 0}
            >
              {formBusy ? <Spinner /> : null}
              {t("me.save")}
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5 text-sm text-muted underline disabled:opacity-70"
              disabled={formBusy}
              onClick={resetForms}
            >
              {t("me.cancel")}
            </button>
          </div>
        </form>
      ) : adding ? (
        <form
          className="mt-3 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-[minmax(0,1.2fr)_6.5rem_minmax(0,1fr)_minmax(0,7rem)_auto] sm:items-end"
          onSubmit={submitAdd}
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.description")}
            <input
              value={description}
              disabled={formBusy}
              onChange={(event) => setDescription(event.target.value)}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg"
              required
              autoFocus
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.amount")}
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={remainingOthers > 0 ? remainingOthers : undefined}
              value={amount || ""}
              disabled={formBusy}
              onChange={(event) => setAmount(Number(event.target.value) || 0)}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg tabular-nums"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.category")}
            <select
              value={categoryId}
              disabled={formBusy}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg"
              required
            >
              <option value="" disabled>
                {t("me.categoryPlaceholder")}
              </option>
              {ledgerCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.cardLineSchedule")}
            <select
              value={scheduleKind}
              disabled={formBusy}
              onChange={(event) =>
                setScheduleKind(event.target.value as ScheduleKind)
              }
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg"
            >
              <option value="once">{t("me.cardInstallmentsOnce")}</option>
              <option value="installments">{t("me.cardInstallments")}</option>
              <option value="recurring">{t("me.cardLineRecurring")}</option>
            </select>
          </label>
          {scheduleKind === "installments" ? (
            <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-full sm:max-w-[8rem]">
              {t("me.installmentCount")}
              <input
                type="number"
                min="2"
                max="120"
                value={installmentCount}
                disabled={formBusy}
                onChange={(event) => setInstallmentCount(event.target.value)}
                className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg tabular-nums"
                required
              />
            </label>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 sm:col-span-full">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm text-fg disabled:opacity-70"
              disabled={formBusy || ledgerCategories.length === 0}
            >
              {formBusy ? <Spinner /> : null}
              {t("me.add")}
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5 text-sm text-muted underline disabled:opacity-70"
              disabled={formBusy}
              onClick={resetForms}
            >
              {t("me.cancel")}
            </button>
          </div>
          {remainingOthers > 0 ? (
            <p className="text-xs text-muted sm:col-span-full">
              {t("me.cardOthersLeft").replace(
                "{amount}",
                formatMoney(remainingOthers, currency, locale)
              )}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="mt-2 flex flex-wrap gap-3 border-t border-border/60 pt-2">
          <button
            type="button"
            className="text-xs text-accent underline disabled:opacity-70"
            disabled={formBusy || ledgerCategories.length === 0}
            onClick={() => {
              setCategoryId(ledgerCategories[0]?.id ?? "");
              setAdding(true);
            }}
          >
            {t("me.cardLineAdd")}
          </button>
          {lineCount > 0 ? (
            <button
              type="button"
              className="text-xs text-muted underline disabled:opacity-70"
              disabled={formBusy}
              onClick={onClear}
            >
              {t("me.cardClearDetail")}
            </button>
          ) : null}
        </div>
      )}

      {editScopePrompt ? (
        <ConfirmSheet
          open
          title={
            editScopePrompt.line.installmentGroupId
              ? t("me.cardLineInstallmentEditTitle")
              : t("me.cardLineRecurringEditTitle")
          }
          description={
            editScopePrompt.line.installmentGroupId
              ? t("me.cardLineInstallmentEditHint").replace(
                  "{n}",
                  String(editScopePrompt.line.installmentNumber ?? "")
                )
              : t("me.cardLineRecurringEditHint")
          }
          pending={pending}
          onClose={() => {
            if (!pending) {
              setEditScopePrompt(null);
            }
          }}
        >
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-fg disabled:opacity-70 sm:py-2"
            disabled={pending}
            onClick={() => void applyEditScope("one")}
          >
            {pending ? <Spinner /> : null}
            {editScopePrompt.line.installmentGroupId
              ? t("me.installmentEditOne")
              : t("me.recurringEditOne")}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2.5 text-sm font-medium text-fg disabled:opacity-70 sm:py-2"
            disabled={pending}
            onClick={() => void applyEditScope("forward")}
          >
            {pending ? <Spinner /> : null}
            {editScopePrompt.line.installmentGroupId
              ? t("me.installmentEditForward")
              : t("me.recurringEditForward")}
          </button>
        </ConfirmSheet>
      ) : null}
    </details>
  );
}
