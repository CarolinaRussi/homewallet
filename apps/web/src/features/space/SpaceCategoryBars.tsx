import type { OverviewCategorySlice } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";
import { getCategoryColor } from "../overview/chart-colors";

type SpaceCategoryBarsProps = {
  slices: OverviewCategorySlice[];
  currency: string;
};

export function SpaceCategoryBars({
  slices,
  currency,
}: SpaceCategoryBarsProps) {
  const { t, locale } = useLocale();

  if (slices.length === 0) {
    return null;
  }

  const maxAmount = Math.max(...slices.map((slice) => slice.amount), 1);

  return (
    <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
      <h2 className="text-lg font-semibold text-fg">
        {t("space.categoriesTitle")}
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {slices.map((slice, index) => {
          const name = slice.isOther
            ? t("overview.compositionOther")
            : slice.name;
          const color = getCategoryColor(slice.categoryId, slice.isOther);
          const widthPercent = Math.max((slice.amount / maxAmount) * 100, 2);

          return (
            <li key={slice.isOther ? "other" : (slice.categoryId ?? index)}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="flex min-w-0 items-center gap-2 sm:w-36">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: color }}
                    aria-hidden
                  />
                  <span className="truncate text-fg">{name}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${widthPercent}%`, background: color }}
                    />
                  </div>
                </div>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatMoney(slice.amount, currency, locale)}
                  <span className="ml-2 text-xs">
                    {Math.round(slice.share * 100)}%
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
