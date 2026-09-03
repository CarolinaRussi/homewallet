import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import type { EntryDateMode, ReserveMovementType } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import {
  formatEntryDate,
  formatMoney,
  monthToOccurredOn,
  todayIsoDate,
} from "../../shared/lib/money";
import { Spinner } from "../../shared/ui/Spinner";
import {
  createReserveMovement,
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
          : t("me.reserveWithdrawn")
      );
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

  const summary = summaryQuery.data;
  const defaultDate =
    entryDateMode === "month"
      ? month
      : todayIsoDate().startsWith(month)
        ? todayIsoDate()
        : `${month}-01`;

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

      {summary?.movements.length ? (
        <ul className="flex flex-col gap-2">
          <h3 className="font-medium text-fg">{t("me.reserveMovements")}</h3>
          {summary.movements.map((movement) => (
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
