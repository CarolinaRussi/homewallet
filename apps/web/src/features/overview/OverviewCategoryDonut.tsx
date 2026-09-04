import type { OverviewCategorySlice } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";

/** Calm sage/stone slices — avoids purple/glow AI defaults. */
const SLICE_COLORS = [
  "var(--hw-accent)",
  "var(--hw-income-fg)",
  "var(--hw-expense-fg)",
  "color-mix(in srgb, var(--hw-accent) 65%, var(--hw-fg))",
  "color-mix(in srgb, var(--hw-muted) 55%, var(--hw-accent))",
  "color-mix(in srgb, var(--hw-border) 40%, var(--hw-muted))",
];

type OverviewCategoryDonutProps = {
  slices: OverviewCategorySlice[];
  totalExpense: number;
  currency: string;
  month: string;
  onMonthChange: (month: string) => void;
  shiftMonth: (month: string, delta: number) => string;
};

export function OverviewCategoryDonut({
  slices,
  totalExpense,
  currency,
  month,
  onMonthChange,
  shiftMonth,
}: OverviewCategoryDonutProps) {
  const { t, locale } = useLocale();

  let cursor = 0;
  const gradientParts = slices.map((slice, index) => {
    const start = cursor * 100;
    cursor += slice.share;
    const end = cursor * 100;
    const color = SLICE_COLORS[index % SLICE_COLORS.length]!;
    return `${color} ${start}% ${end}%`;
  });
  const donutBackground =
    slices.length === 0
      ? "var(--hw-border)"
      : `conic-gradient(${gradientParts.join(", ")})`;

  return (
    <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">
          {t("overview.compositionTitle")}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
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
          <div
            className="relative size-44 shrink-0 rounded-full"
            style={{ background: donutBackground }}
            role="img"
            aria-label={t("overview.compositionTitle")}
          >
            <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-surface text-center">
              <span className="text-xs text-muted">
                {t("overview.compositionTotal")}
              </span>
              <span className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
                {formatMoney(totalExpense, currency, locale)}
              </span>
            </div>
          </div>
          <ul className="flex w-full flex-col gap-2">
            {slices.map((slice, index) => (
              <li
                key={
                  slice.isOther
                    ? "other"
                    : (slice.categoryId ?? `${slice.name}-${index}`)
                }
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{
                      background: SLICE_COLORS[index % SLICE_COLORS.length],
                    }}
                    aria-hidden
                  />
                  <span className="truncate text-fg">
                    {slice.isOther
                      ? t("overview.compositionOther")
                      : slice.name}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatMoney(slice.amount, currency, locale)}
                  <span className="ml-2 text-xs">
                    {Math.round(slice.share * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
