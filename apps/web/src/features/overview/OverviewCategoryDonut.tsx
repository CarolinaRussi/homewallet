import type { OverviewCategorySlice } from "@homewallet/shared";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";
import { getCategoryColor } from "./chart-colors";
import {
  OverviewChartTooltipRow,
  OverviewChartTooltipShell,
} from "./OverviewChartTooltip";
import { formatMonthLong } from "./overview-chart-utils";

type DonutRow = OverviewCategorySlice & {
  color: string;
  percent: number;
};

type OverviewCategoryDonutProps = {
  slices: OverviewCategorySlice[];
  totalExpense: number;
  currency: string;
  month: string;
  onMonthChange: (month: string) => void;
  shiftMonth: (month: string, delta: number) => string;
};

function buildDonutRows(slices: OverviewCategorySlice[]): DonutRow[] {
  return slices.map((slice) => ({
    ...slice,
    color: getCategoryColor(slice.categoryId, slice.isOther),
    percent: Math.round(slice.share * 100),
  }));
}

function CategoryTooltipContent({
  row,
  currency,
  locale,
  otherLabel,
}: {
  row: DonutRow;
  currency: string;
  locale: string;
  otherLabel: string;
}) {
  const name = row.isOther ? otherLabel : row.name;
  return (
    <OverviewChartTooltipShell>
      <p className="mb-1.5 font-medium text-fg">{name}</p>
      <OverviewChartTooltipRow
        label={`${row.percent}%`}
        value={formatMoney(row.amount, currency, locale)}
        markerColor={row.color}
      />
    </OverviewChartTooltipShell>
  );
}

export function OverviewCategoryDonut({
  slices,
  totalExpense,
  currency,
  month,
  onMonthChange,
  shiftMonth,
}: OverviewCategoryDonutProps) {
  const { t, locale } = useLocale();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const rows = buildDonutRows(slices);

  const monthLabel = formatMonthLong(month, locale);

  return (
    <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">
            {t("overview.compositionTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            {t("overview.compositionMonth")}: {monthLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            aria-label={t("overview.prevMonth")}
          >
            ←
          </button>
          <span className="min-w-24 text-center text-sm font-medium text-fg">
            {month}
          </span>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            aria-label={t("overview.nextMonth")}
          >
            →
          </button>
        </div>
      </div>

      {totalExpense <= 0 ? (
        <p className="mt-6 text-sm text-muted">
          {t("overview.compositionEmpty")}
        </p>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative size-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="100%"
                  paddingAngle={1}
                  stroke="var(--hw-surface)"
                  strokeWidth={2}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {rows.map((row, index) => (
                    <Cell
                      key={
                        row.isOther
                          ? "other"
                          : (row.categoryId ?? `${row.name}-${index}`)
                      }
                      fill={row.color}
                      opacity={
                        activeIndex === null || activeIndex === index ? 1 : 0.35
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) {
                      return null;
                    }
                    const row = payload[0]?.payload as DonutRow | undefined;
                    if (!row) {
                      return null;
                    }
                    return (
                      <CategoryTooltipContent
                        row={row}
                        currency={currency}
                        locale={locale}
                        otherLabel={t("overview.compositionOther")}
                      />
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              className="pointer-events-none absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-surface text-center"
              aria-hidden
            >
              <span className="text-xs text-muted">
                {t("overview.compositionTotal")}
              </span>
              <span className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
                {formatMoney(totalExpense, currency, locale)}
              </span>
            </div>
          </div>

          <ul className="flex w-full flex-col gap-1.5">
            {rows.map((row, index) => {
              const name = row.isOther
                ? t("overview.compositionOther")
                : row.name;
              const isActive = activeIndex === index;
              return (
                <li key={row.isOther ? "other" : (row.categoryId ?? index)}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-sm transition-colors ${
                      isActive ? "bg-bg" : "hover:bg-bg"
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(null)}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{ background: row.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 truncate text-fg">{name}</span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {formatMoney(row.amount, currency, locale)}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {row.percent}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <table className="sr-only">
        <caption>{t("overview.compositionTitle")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("overview.compositionTitle")}</th>
            <th scope="col">{t("overview.compositionTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.isOther ? "other" : (row.categoryId ?? row.name)}>
              <td>{row.isOther ? t("overview.compositionOther") : row.name}</td>
              <td>{formatMoney(row.amount, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
