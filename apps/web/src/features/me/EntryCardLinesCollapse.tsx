import { useState } from "react";
import type { FormEvent } from "react";
import type {
  AddEntryCardLineBody,
  CategorySummary,
  EntrySummary,
} from "@homewallet/shared";
import { SAVING_CATEGORY_NAME } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";
import { Spinner } from "../../shared/ui/Spinner";

type EntryCardLinesCollapseProps = {
  entry: EntrySummary;
  categories: CategorySummary[];
  currency: string;
  pending: boolean;
  onAdd: (body: AddEntryCardLineBody) => Promise<unknown>;
  onRemoveLine: (lineId: string) => void;
  onClear: () => void;
};

export function EntryCardLinesCollapse({
  entry,
  categories,
  currency,
  pending,
  onAdd,
  onRemoveLine,
  onClear,
}: EntryCardLinesCollapseProps) {
  const { t, locale } = useLocale();
  const [adding, setAdding] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState("");
  const [installmentCount, setInstallmentCount] = useState("");
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

  function resetAddForm() {
    setAdding(false);
    setDescription("");
    setAmount(0);
    setCategoryId("");
    setInstallmentCount("");
  }

  async function submitAdd(event: FormEvent) {
    event.preventDefault();
    if (!description.trim() || amount <= 0 || !categoryId) {
      return;
    }
    const parcels = Number(installmentCount);
    const body: AddEntryCardLineBody = {
      description: description.trim(),
      amount,
      categoryId,
    };
    if (Number.isInteger(parcels) && parcels >= 2) {
      body.installmentCount = parcels;
    }
    try {
      await onAdd(body);
      resetAddForm();
    } catch {
      // keep form open; parent shows the error
    }
  }

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
              </span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums text-expense-fg">
                  {formatMoney(line.amount, currency, locale)}
                </span>
                <button
                  type="button"
                  className="text-xs text-muted underline disabled:opacity-70"
                  disabled={pending}
                  onClick={() => onRemoveLine(line.id)}
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

      {adding ? (
        <form
          className="mt-3 grid gap-2 border-t border-border/60 pt-3 sm:grid-cols-[minmax(0,1.2fr)_6.5rem_minmax(0,1fr)_5rem_auto] sm:items-end"
          onSubmit={submitAdd}
        >
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.description")}
            <input
              value={description}
              disabled={pending}
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
              disabled={pending}
              onChange={(event) => setAmount(Number(event.target.value) || 0)}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg tabular-nums"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            {t("me.category")}
            <select
              value={categoryId}
              disabled={pending}
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
            {t("me.cardInstallments")}
            <input
              type="number"
              min="2"
              max="120"
              value={installmentCount}
              disabled={pending}
              onChange={(event) => setInstallmentCount(event.target.value)}
              placeholder={t("me.cardInstallmentsOnce")}
              className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-fg tabular-nums"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm text-fg disabled:opacity-70"
              disabled={pending || ledgerCategories.length === 0}
            >
              {pending ? <Spinner /> : null}
              {t("me.add")}
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5 text-sm text-muted underline disabled:opacity-70"
              disabled={pending}
              onClick={resetAddForm}
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
            disabled={pending || ledgerCategories.length === 0}
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
              disabled={pending}
              onClick={onClear}
            >
              {t("me.cardClearDetail")}
            </button>
          ) : null}
        </div>
      )}
    </details>
  );
}
