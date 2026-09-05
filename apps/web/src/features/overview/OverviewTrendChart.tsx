import type {
  OverviewMonthPoint,
  OverviewRangePreset,
} from "@homewallet/shared";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";
import {
  OverviewChartTooltipDivider,
  OverviewChartTooltipRow,
  OverviewChartTooltipShell,
} from "./OverviewChartTooltip";
import {
  buildTrendChartRows,
  formatCompactMoney,
  formatDelta,
  formatMonthLong,
  type TrendChartRow,
} from "./overview-chart-utils";

type OverviewTrendChartProps = {
  points: OverviewMonthPoint[];
  includesIncome: boolean;
  currency: string;
  range: OverviewRangePreset;
};

const INCOME_BAR = "var(--hw-income-fg)";
const EXPENSE_BAR = "var(--hw-expense-fg)";

function TrendTooltipContent({
  row,
  includesIncome,
  currency,
  locale,
  labels,
}: {
  row: TrendChartRow;
  includesIncome: boolean;
  currency: string;
  locale: string;
  labels: {
    income: string;
    expense: string;
    balance: string;
    vsPrevious: string;
    deltaExpense: string;
    deltaIncome: string;
  };
}) {
  const expenseDelta = row.expenseDelta;
  const incomeDelta = row.incomeDelta;

  return (
    <OverviewChartTooltipShell>
      <p className="mb-2 font-medium text-fg">
        {formatMonthLong(row.month, locale)}
      </p>
      <div className="flex flex-col gap-1.5">
        {includesIncome ? (
          <OverviewChartTooltipRow
            label={labels.income}
            value={formatMoney(row.income, currency, locale)}
            markerColor={INCOME_BAR}
          />
        ) : null}
        <OverviewChartTooltipRow
          label={labels.expense}
          value={formatMoney(row.expense, currency, locale)}
          markerColor={EXPENSE_BAR}
        />
        {includesIncome ? (
          <OverviewChartTooltipRow
            label={labels.balance}
            value={formatMoney(row.balance, currency, locale)}
            valueClassName={
              row.balance >= 0 ? "text-income-fg" : "text-expense-fg"
            }
          />
        ) : null}
      </div>
      {expenseDelta != null ? (
        <>
          <OverviewChartTooltipDivider />
          <p className="mb-1.5 text-xs text-muted">{labels.vsPrevious}</p>
          <div className="flex flex-col gap-1">
            <OverviewChartTooltipRow
              label={labels.deltaExpense}
              value={`${formatDelta(expenseDelta, currency, locale)}${expenseDelta > 0 ? " ↑" : expenseDelta < 0 ? " ↓" : ""}`}
              valueClassName={
                expenseDelta > 0
                  ? "text-expense-fg"
                  : expenseDelta < 0
                    ? "text-income-fg"
                    : "text-fg"
              }
            />
            {includesIncome && incomeDelta != null ? (
              <OverviewChartTooltipRow
                label={labels.deltaIncome}
                value={`${formatDelta(incomeDelta, currency, locale)}${incomeDelta > 0 ? " ↑" : incomeDelta < 0 ? " ↓" : ""}`}
                valueClassName={
                  incomeDelta > 0
                    ? "text-income-fg"
                    : incomeDelta < 0
                      ? "text-expense-fg"
                      : "text-fg"
                }
              />
            ) : null}
          </div>
        </>
      ) : null}
    </OverviewChartTooltipShell>
  );
}

export function OverviewTrendChart({
  points,
  includesIncome,
  currency,
  range,
}: OverviewTrendChartProps) {
  const { t, locale } = useLocale();
  const rows = buildTrendChartRows(points, locale);

  const rangeLabel = t(
    (
      {
        "3": "overview.range.3",
        "6": "overview.range.6",
        "12": "overview.range.12",
        ytd: "overview.range.ytd",
      } as const
    )[range]
  );
  const subtitle = `${rangeLabel} · ${t("overview.trendMonthlyValues")}`;

  const tooltipLabels = {
    income: t("overview.legendIncome"),
    expense: t("overview.legendExpense"),
    balance: t("overview.monthBalance"),
    vsPrevious: t("overview.vsPreviousMonth"),
    deltaExpense: t("overview.legendExpense"),
    deltaIncome: t("overview.legendIncome"),
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-fg">
            {t("overview.trendTitle")}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          {includesIncome ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm"
                  style={{ background: INCOME_BAR }}
                  aria-hidden
                />
                {t("overview.legendIncome")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-0.5 w-3 rounded-full"
                  style={{ background: INCOME_BAR }}
                  aria-hidden
                />
                {t("overview.trendLineIncome")}
              </span>
            </>
          ) : null}
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ background: EXPENSE_BAR }}
              aria-hidden
            />
            {t("overview.legendExpense")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ background: EXPENSE_BAR }}
              aria-hidden
            />
            {t("overview.trendLineExpense")}
          </span>
        </div>
      </div>

      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={rows}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              stroke="var(--hw-border)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--hw-muted)", fontSize: 12 }}
              axisLine={{ stroke: "var(--hw-border)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--hw-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(value) =>
                formatCompactMoney(Number(value), currency, locale)
              }
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) {
                  return null;
                }
                const row = payload[0]?.payload as TrendChartRow | undefined;
                if (!row) {
                  return null;
                }
                return (
                  <TrendTooltipContent
                    row={row}
                    includesIncome={includesIncome}
                    currency={currency}
                    locale={locale}
                    labels={tooltipLabels}
                  />
                );
              }}
              cursor={{
                fill: "color-mix(in srgb, var(--hw-accent) 8%, transparent)",
              }}
            />
            {includesIncome ? (
              <Bar
                dataKey="income"
                name={t("overview.legendIncome")}
                fill={INCOME_BAR}
                radius={[3, 3, 0, 0]}
                barSize={14}
              />
            ) : null}
            <Bar
              dataKey="expense"
              name={t("overview.legendExpense")}
              fill={EXPENSE_BAR}
              radius={[3, 3, 0, 0]}
              barSize={14}
            />
            {includesIncome ? (
              <Line
                type="monotone"
                dataKey="income"
                stroke={INCOME_BAR}
                strokeWidth={2}
                dot={{ r: 3, fill: INCOME_BAR, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="expense"
              stroke={EXPENSE_BAR}
              strokeWidth={2}
              dot={{ r: 3, fill: EXPENSE_BAR, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{t("overview.trendTitle")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("overview.compositionMonth")}</th>
            {includesIncome ? (
              <th scope="col">{t("overview.legendIncome")}</th>
            ) : null}
            <th scope="col">{t("overview.legendExpense")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <td>{formatMonthLong(row.month, locale)}</td>
              {includesIncome ? (
                <td>{formatMoney(row.income, currency, locale)}</td>
              ) : null}
              <td>{formatMoney(row.expense, currency, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
