import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";
import { formatMonthLong } from "../overview/overview-chart-utils";

type SpaceMonthHeroProps = {
  totalExpense: number;
  month: string;
  currency: string;
  hint: string;
};

export function SpaceMonthHero({
  totalExpense,
  month,
  currency,
  hint,
}: SpaceMonthHeroProps) {
  const { t, locale } = useLocale();

  return (
    <article className="rounded-lg border border-border bg-surface p-5 md:p-6">
      <p className="text-sm font-medium text-muted">{t("space.monthSpend")}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-fg md:text-4xl">
        {formatMoney(totalExpense, currency, locale)}
      </p>
      <p className="mt-1 text-sm text-muted">
        {formatMonthLong(month, locale)}
      </p>
      <p className="mt-3 text-xs text-muted">{hint}</p>
    </article>
  );
}
