import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type {
  EntryDateMode,
  MonthSummary,
  ProgressSnapshot,
} from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import {
  formatMoney,
  monthToOccurredOn,
  todayIsoDate,
} from "../../shared/lib/money";
import { Spinner } from "../../shared/ui/Spinner";
import { SummaryCardsSkeleton } from "../../shared/ui/Skeleton";
import {
  createLeftoverSeed,
  deleteLeftoverSeed,
  invalidateMonthSummaryAfterWrite,
} from "./leftover-api";

type LeftoverReserveSectionProps = {
  spaceId: string;
  month: string;
  currency: string;
  entryDateMode: EntryDateMode;
  summary?: MonthSummary;
  summaryLoading?: boolean;
  summaryRefreshing?: boolean;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function LeftoverReserveSection({
  spaceId,
  month,
  currency,
  entryDateMode,
  summary,
  summaryLoading = false,
  summaryRefreshing = false,
  onError,
  onSuccess,
}: LeftoverReserveSectionProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();

  const leftoverSeedMutation = useMutation({
    mutationFn: (body: {
      amount: number;
      occurredOn: string;
      description: string;
    }) => createLeftoverSeed(spaceId, body),
    onSuccess: () => {
      onSuccess(t("me.leftoverSeeded"));
      invalidateMonthSummaryAfterWrite(queryClient, spaceId);
    },
    onError: (error: Error) => onError(error.message),
  });

  const deleteLeftoverMutation = useMutation({
    mutationFn: deleteLeftoverSeed,
    onSuccess: () => {
      onSuccess(t("me.leftoverSeedDeleted"));
      invalidateMonthSummaryAfterWrite(queryClient, spaceId);
    },
    onError: (error: Error) => onError(error.message),
  });

  function onLeftoverSeedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const rawDate = String(data.get("occurredOn") ?? "");
    const occurredOn =
      entryDateMode === "month" ? monthToOccurredOn(rawDate) : rawDate;
    leftoverSeedMutation.mutate({
      amount: Number(data.get("amount")),
      occurredOn,
      description: String(data.get("description") ?? ""),
    });
    form.reset();
  }

  const defaultDate =
    entryDateMode === "month"
      ? month
      : todayIsoDate().startsWith(month)
        ? todayIsoDate()
        : `${month}-01`;

  if (summaryLoading) {
    return (
      <section className="flex flex-col gap-4">
        <SummaryCardsSkeleton />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      {summaryRefreshing ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted">
          <Spinner />
          {t("me.updating")}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">{t("me.income")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-income-fg">
            {formatMoney(
              (summary?.income ?? 0) + (summary?.withdrawn ?? 0),
              currency,
              locale
            )}
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">{t("me.expense")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-expense-fg">
            {formatMoney(summary?.expense ?? 0, currency, locale)}
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">{t("me.leftover")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-fg">
            {formatMoney(summary?.leftover ?? 0, currency, locale)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {t("me.carriedIn")}:{" "}
            {formatMoney(summary?.carriedIn ?? 0, currency, locale)}
          </p>
        </article>
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">{t("me.reserve")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-accent">
            {formatMoney(summary?.reserveBalance ?? 0, currency, locale)}
          </p>
          <Link
            to="/reserve"
            className="mt-2 inline-block text-xs text-accent underline"
          >
            {t("reserve.openTab")}
          </Link>
        </article>
      </div>

      {summary?.personalLimit ||
      summary?.leftoverTarget ||
      summary?.budgetLayers ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {summary.personalLimit ? (
            <LimitProgressCard
              title={t("limits.personal")}
              progress={summary.personalLimit}
              currency={currency}
              locale={locale}
              overLabel={t("limits.over")}
              remainingLabel={t("limits.remaining")}
            />
          ) : null}
          {summary.leftoverTarget ? (
            <LimitProgressCard
              title={t("limits.leftoverTarget")}
              progress={summary.leftoverTarget}
              currency={currency}
              locale={locale}
              overLabel={t("limits.targetMet")}
              remainingLabel={t("limits.toTarget")}
            />
          ) : null}
          {summary.budgetLayers ? (
            <article className="rounded-lg border border-border bg-surface p-4 lg:col-span-2">
              <h3 className="font-medium text-fg">{t("limits.layersTitle")}</h3>
              <p className="mt-1 text-xs text-muted">
                {t("limits.layersHint")} · {t("me.income")}:{" "}
                {formatMoney(summary.budgetLayers.income, currency, locale)}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["essential", t("limits.layerEssential")],
                    ["personal", t("limits.layerPersonal")],
                    ["future", t("limits.layerFuture")],
                  ] as const
                ).map(([key, label]) => (
                  <LimitProgressCard
                    key={key}
                    title={label}
                    progress={summary.budgetLayers!.byLayer[key]}
                    currency={currency}
                    locale={locale}
                    overLabel={t("limits.over")}
                    remainingLabel={t("limits.remaining")}
                    compact
                  />
                ))}
              </div>
              {summary.budgetLayers.unmappedExpense > 0 ? (
                <p className="mt-2 text-xs text-muted">
                  {t("limits.unmapped")}:{" "}
                  {formatMoney(
                    summary.budgetLayers.unmappedExpense,
                    currency,
                    locale
                  )}
                </p>
              ) : null}
            </article>
          ) : null}
        </div>
      ) : null}

      <details className="rounded-md border border-dashed border-border px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted">
          {t("me.openingBalances")}
        </summary>
        <p className="mt-2 text-xs text-muted">{t("me.openingBalancesHint")}</p>
        <form
          className="mt-3 flex flex-col gap-2"
          onSubmit={onLeftoverSeedSubmit}
        >
          <p className="font-medium text-fg">{t("me.leftoverSeed")}</p>
          <ReserveFields
            entryDateMode={entryDateMode}
            defaultDate={defaultDate}
            amountLabel={t("me.amount")}
            dateLabel={entryDateMode === "month" ? t("me.month") : t("me.date")}
            descriptionLabel={t("me.description")}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-fg disabled:opacity-70 sm:self-start"
            disabled={leftoverSeedMutation.isPending}
          >
            {leftoverSeedMutation.isPending ? <Spinner /> : null}
            {t("me.leftoverSeedSubmit")}
          </button>
        </form>
        {summary?.leftoverSeeds.length ? (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
            {summary.leftoverSeeds.map((seed) => (
              <li
                key={seed.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {t("me.leftoverSeed")}:{" "}
                  {formatMoney(seed.amount, currency, locale)}
                </span>
                <button
                  type="button"
                  className="underline disabled:opacity-70"
                  disabled={deleteLeftoverMutation.isPending}
                  onClick={() => deleteLeftoverMutation.mutate(seed.id)}
                >
                  {t("me.delete")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </details>
    </section>
  );
}

function LimitProgressCard({
  title,
  progress,
  currency,
  locale,
  overLabel,
  remainingLabel,
  compact = false,
}: {
  title: string;
  progress: ProgressSnapshot;
  currency: string;
  locale: string;
  overLabel: string;
  remainingLabel: string;
  compact?: boolean;
}) {
  const ratio = Math.min(progress.ratio, 1);
  const over = progress.overBy > 0;
  return (
    <article
      className={
        compact
          ? "rounded-md border border-border bg-bg p-3"
          : "rounded-lg border border-border bg-surface p-4"
      }
    >
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mt-1 text-sm tabular-nums text-muted">
        {formatMoney(progress.current, currency, locale)} /{" "}
        {formatMoney(progress.target, currency, locale)}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${over ? "bg-expense-fg" : "bg-accent"}`}
          style={{ width: `${Math.max(ratio * 100, over ? 100 : 0)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {over
          ? `${overLabel}: ${formatMoney(progress.overBy, currency, locale)}`
          : `${remainingLabel}: ${formatMoney(progress.remaining, currency, locale)}`}
      </p>
    </article>
  );
}

function ReserveFields({
  entryDateMode,
  defaultDate,
  amountLabel,
  dateLabel,
  descriptionLabel,
}: {
  entryDateMode: EntryDateMode;
  defaultDate: string;
  amountLabel: string;
  dateLabel: string;
  descriptionLabel: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        {amountLabel}
        <input
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        {dateLabel}
        <input
          name="occurredOn"
          type={entryDateMode === "month" ? "month" : "date"}
          required
          defaultValue={defaultDate}
          className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        {descriptionLabel}
        <input
          name="description"
          className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
        />
      </label>
    </div>
  );
}
