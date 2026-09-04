import type { OverviewMonthPoint } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";

type OverviewTrendChartProps = {
  points: OverviewMonthPoint[];
  includesIncome: boolean;
  currency: string;
  endMonth: string;
  onEndMonthChange: (month: string) => void;
  shiftMonth: (month: string, delta: number) => string;
};

function formatDelta(delta: number, currency: string, locale: string): string {
  const absolute = formatMoney(Math.abs(delta), currency, locale);
  if (delta > 0) {
    return `+${absolute}`;
  }
  if (delta < 0) {
    return `−${absolute}`;
  }
  return absolute;
}

export function OverviewTrendChart({
  points,
  includesIncome,
  currency,
  endMonth,
  onEndMonthChange,
  shiftMonth,
}: OverviewTrendChartProps) {
  const { t, locale } = useLocale();
  const maxValue = Math.max(
    1,
    ...points.flatMap((point) =>
      includesIncome ? [point.income, point.expense] : [point.expense]
    )
  );

  return (
    <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">
          {t("overview.trendTitle")}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            {includesIncome ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm bg-income-fg"
                  aria-hidden
                />
                {t("overview.legendIncome")}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-expense-fg" aria-hidden />
              {t("overview.legendExpense")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
              onClick={() => onEndMonthChange(shiftMonth(endMonth, -1))}
            >
              ←
            </button>
            <span className="min-w-24 text-center text-sm font-medium text-fg">
              {endMonth}
            </span>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
              onClick={() => onEndMonthChange(shiftMonth(endMonth, 1))}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div
        className="mt-6 flex items-end gap-2 overflow-x-auto pb-1 sm:gap-3"
        role="img"
        aria-label={t("overview.trendTitle")}
      >
        {points.map((point) => {
          const incomeHeight = includesIncome
            ? `${Math.max((point.income / maxValue) * 100, point.income > 0 ? 2 : 0)}%`
            : "0%";
          const expenseHeight = `${Math.max((point.expense / maxValue) * 100, point.expense > 0 ? 2 : 0)}%`;
          return (
            <div
              key={point.month}
              className="flex min-w-10 flex-1 flex-col items-center gap-1.5 sm:min-w-12"
            >
              <div className="flex h-40 w-full items-end justify-center gap-1">
                {includesIncome ? (
                  <div
                    className="w-2.5 rounded-t bg-income-fg sm:w-3"
                    style={{ height: incomeHeight }}
                    title={`${t("overview.legendIncome")}: ${formatMoney(point.income, currency, locale)}`}
                  />
                ) : null}
                <div
                  className="w-2.5 rounded-t bg-expense-fg sm:w-3"
                  style={{ height: expenseHeight }}
                  title={`${t("overview.legendExpense")}: ${formatMoney(point.expense, currency, locale)}`}
                />
              </div>
              <span className="text-xs font-medium tabular-nums text-fg">
                {point.month.slice(5)}
              </span>
              {point.expenseDelta != null ? (
                <span
                  className="max-w-full truncate text-[10px] tabular-nums text-muted"
                  title={
                    includesIncome && point.incomeDelta != null
                      ? `${t("overview.deltaExpense")}: ${formatDelta(point.expenseDelta, currency, locale)} · ${t("overview.deltaIncome")}: ${formatDelta(point.incomeDelta, currency, locale)}`
                      : `${t("overview.deltaExpense")}: ${formatDelta(point.expenseDelta, currency, locale)}`
                  }
                >
                  {formatDelta(point.expenseDelta, currency, locale)}
                </span>
              ) : (
                <span className="text-[10px] text-transparent">—</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
