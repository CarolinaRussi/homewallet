import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import type {
  EntryDateMode,
  ProgressSnapshot,
  ReserveMovementType,
} from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import {
  formatEntryDate,
  formatMoney,
  monthToOccurredOn,
  todayIsoDate,
} from "../../shared/lib/money";
import { Spinner } from "../../shared/ui/Spinner";
import { updateMyLimits } from "../spaces/space-api";
import {
  createLeftoverSeed,
  createReserveMovement,
  deleteLeftoverSeed,
  deleteReserveMovement,
  fetchMonthSummary,
} from "./leftover-api";

type LeftoverReserveSectionProps = {
  spaceId: string;
  month: string;
  currency: string;
  entryDateMode: EntryDateMode;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function LeftoverReserveSection({
  spaceId,
  month,
  currency,
  entryDateMode,
  onError,
  onSuccess,
}: LeftoverReserveSectionProps) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ["month-summary", spaceId, month],
    queryFn: () => fetchMonthSummary(spaceId, month),
  });

  const moveMutation = useMutation({
    mutationFn: (body: {
      type: ReserveMovementType;
      amount: number;
      occurredOn: string;
      description: string;
    }) => createReserveMovement(spaceId, body),
    onSuccess: async (_movement, variables) => {
      onSuccess(
        variables.type === "contribute"
          ? t("me.reserveContributed")
          : variables.type === "seed"
            ? t("me.reserveSeeded")
            : t("me.reserveWithdrawn")
      );
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => onError(error.message),
  });

  const leftoverSeedMutation = useMutation({
    mutationFn: (body: {
      amount: number;
      occurredOn: string;
      description: string;
    }) => createLeftoverSeed(spaceId, body),
    onSuccess: async () => {
      onSuccess(t("me.leftoverSeeded"));
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => onError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReserveMovement,
    onSuccess: async () => {
      onSuccess(t("me.reserveDeleted"));
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => onError(error.message),
  });

  const deleteLeftoverMutation = useMutation({
    mutationFn: deleteLeftoverSeed,
    onSuccess: async () => {
      onSuccess(t("me.leftoverSeedDeleted"));
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => onError(error.message),
  });

  const myLimitsMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMyLimits>[1]) =>
      updateMyLimits(spaceId, body),
    onSuccess: async () => {
      onSuccess(t("limits.saved"));
      await queryClient.invalidateQueries({
        queryKey: ["month-summary", spaceId],
      });
    },
    onError: (error: Error) => onError(error.message),
  });

  function onReserveSubmit(
    event: FormEvent<HTMLFormElement>,
    type: ReserveMovementType
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const rawDate = String(data.get("occurredOn") ?? "");
    const occurredOn =
      entryDateMode === "month" ? monthToOccurredOn(rawDate) : rawDate;
    moveMutation.mutate({
      type,
      amount: Number(data.get("amount")),
      occurredOn,
      description: String(data.get("description") ?? ""),
    });
    form.reset();
  }

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

  function onMyLimitsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const personalEnabled = data.get("personalLimitEnabled") === "on";
    const leftoverEnabled = data.get("leftoverTargetEnabled") === "on";
    const personalRaw = String(data.get("personalLimitAmount") ?? "").trim();
    const leftoverRaw = String(data.get("leftoverTargetAmount") ?? "").trim();
    myLimitsMutation.mutate({
      personalLimitEnabled: personalEnabled,
      personalLimitAmount: personalEnabled ? Number(personalRaw) : null,
      leftoverTargetEnabled: leftoverEnabled,
      leftoverTargetAmount: leftoverEnabled ? Number(leftoverRaw) : null,
    });
  }

  const summary = summaryQuery.data;
  const defaultDate =
    entryDateMode === "month"
      ? month
      : todayIsoDate().startsWith(month)
        ? todayIsoDate()
        : `${month}-01`;
  const openingBusy = moveMutation.isPending || leftoverSeedMutation.isPending;
  const seedMovements =
    summary?.movements.filter((movement) => movement.type === "seed") ?? [];
  const dayToDayMovements =
    summary?.movements.filter((movement) => movement.type !== "seed") ?? [];

  return (
    <section className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-lg border border-border bg-surface p-4">
          <p className="text-sm text-muted">{t("me.income")}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-income-fg">
            {formatMoney(summary?.income ?? 0, currency, locale)}
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
          {t("limits.myLimits")}
        </summary>
        <p className="mt-2 text-xs text-muted">{t("limits.myLimitsHint")}</p>
        <form
          className="mt-3 grid gap-3 sm:grid-cols-2"
          onSubmit={onMyLimitsSubmit}
        >
          <label className="flex flex-col gap-1 text-sm text-muted">
            <span className="flex items-center gap-2 text-fg">
              <input
                name="personalLimitEnabled"
                type="checkbox"
                defaultChecked={summary?.myLimits.personalLimitEnabled}
              />
              {t("limits.personal")}
            </span>
            <input
              name="personalLimitAmount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={summary?.myLimits.personalLimitAmount ?? ""}
              placeholder={t("limits.amount")}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            <span className="flex items-center gap-2 text-fg">
              <input
                name="leftoverTargetEnabled"
                type="checkbox"
                defaultChecked={summary?.myLimits.leftoverTargetEnabled}
              />
              {t("limits.leftoverTarget")}
            </span>
            <input
              name="leftoverTargetAmount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={summary?.myLimits.leftoverTargetAmount ?? ""}
              placeholder={t("limits.amount")}
              className="rounded-md border border-border bg-bg px-3 py-2 text-fg"
            />
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-fg disabled:opacity-70 sm:col-span-2 sm:justify-self-start"
            disabled={myLimitsMutation.isPending}
          >
            {myLimitsMutation.isPending ? <Spinner /> : null}
            {t("limits.save")}
          </button>
        </form>
      </details>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
          onSubmit={(event) => onReserveSubmit(event, "contribute")}
        >
          <h3 className="font-medium text-fg">{t("me.reserveContribute")}</h3>
          <p className="text-xs text-muted">{t("me.reserveContributeHint")}</p>
          <ReserveFields
            entryDateMode={entryDateMode}
            defaultDate={defaultDate}
            amountLabel={t("me.amount")}
            dateLabel={entryDateMode === "month" ? t("me.month") : t("me.date")}
            descriptionLabel={t("me.description")}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 font-medium text-accent-fg disabled:opacity-70"
            disabled={moveMutation.isPending}
          >
            {moveMutation.isPending ? <Spinner /> : null}
            {moveMutation.isPending
              ? t("me.saving")
              : t("me.reserveContributeSubmit")}
          </button>
        </form>

        <form
          className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
          onSubmit={(event) => onReserveSubmit(event, "withdraw")}
        >
          <h3 className="font-medium text-fg">{t("me.reserveWithdraw")}</h3>
          <p className="text-xs text-muted">{t("me.reserveWithdrawHint")}</p>
          <ReserveFields
            entryDateMode={entryDateMode}
            defaultDate={defaultDate}
            amountLabel={t("me.amount")}
            dateLabel={entryDateMode === "month" ? t("me.month") : t("me.date")}
            descriptionLabel={t("me.description")}
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 font-medium text-fg disabled:opacity-70"
            disabled={moveMutation.isPending}
          >
            {moveMutation.isPending ? <Spinner /> : null}
            {moveMutation.isPending
              ? t("me.saving")
              : t("me.reserveWithdrawSubmit")}
          </button>
        </form>
      </div>

      <details className="rounded-md border border-dashed border-border px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted">
          {t("me.openingBalances")}
        </summary>
        <p className="mt-2 text-xs text-muted">{t("me.openingBalancesHint")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <form className="flex flex-col gap-2" onSubmit={onLeftoverSeedSubmit}>
            <p className="font-medium text-fg">{t("me.leftoverSeed")}</p>
            <ReserveFields
              entryDateMode={entryDateMode}
              defaultDate={defaultDate}
              amountLabel={t("me.amount")}
              dateLabel={
                entryDateMode === "month" ? t("me.month") : t("me.date")
              }
              descriptionLabel={t("me.description")}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-fg disabled:opacity-70"
              disabled={openingBusy}
            >
              {leftoverSeedMutation.isPending ? <Spinner /> : null}
              {t("me.leftoverSeedSubmit")}
            </button>
          </form>
          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => onReserveSubmit(event, "seed")}
          >
            <p className="font-medium text-fg">{t("me.reserveSeed")}</p>
            <ReserveFields
              entryDateMode={entryDateMode}
              defaultDate={defaultDate}
              amountLabel={t("me.amount")}
              dateLabel={
                entryDateMode === "month" ? t("me.month") : t("me.date")
              }
              descriptionLabel={t("me.description")}
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-3 py-1.5 text-fg disabled:opacity-70"
              disabled={openingBusy}
            >
              {moveMutation.isPending ? <Spinner /> : null}
              {t("me.reserveSeedSubmit")}
            </button>
          </form>
        </div>
        {summary?.leftoverSeeds.length || seedMovements.length ? (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
            {summary?.leftoverSeeds.map((seed) => (
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
            {seedMovements.map((movement) => (
              <li
                key={movement.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {t("me.reserveSeed")}:{" "}
                  {formatMoney(movement.amount, currency, locale)}
                </span>
                <button
                  type="button"
                  className="underline disabled:opacity-70"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(movement.id)}
                >
                  {t("me.delete")}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </details>

      {dayToDayMovements.length ? (
        <ul className="flex flex-col gap-2">
          <h3 className="font-medium text-fg">{t("me.reserveMovements")}</h3>
          {dayToDayMovements.map((movement) => (
            <li
              key={movement.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-fg">
                  {movement.type === "contribute"
                    ? t("me.reserveContribute")
                    : t("me.reserveWithdraw")}
                  {movement.description ? (
                    <span className="font-normal text-muted">
                      {" "}
                      · {movement.description}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">
                  {formatEntryDate(movement.occurredOn, entryDateMode)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="tabular-nums font-semibold text-fg">
                  {formatMoney(movement.amount, currency, locale)}
                </p>
                <button
                  type="button"
                  className="text-sm text-expense-fg underline disabled:opacity-70"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(movement.id)}
                >
                  {t("me.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
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
