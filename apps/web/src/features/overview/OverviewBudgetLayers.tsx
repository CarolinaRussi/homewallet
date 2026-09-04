import type { BudgetLayersSummary, ProgressSnapshot } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";

type OverviewBudgetLayersProps = {
  budgetLayers: BudgetLayersSummary;
  currency: string;
};

export function OverviewBudgetLayers({
  budgetLayers,
  currency,
}: OverviewBudgetLayersProps) {
  const { t, locale } = useLocale();

  return (
    <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
      <h2 className="text-lg font-semibold text-fg">
        {t("overview.layersTitle")}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {t("limits.layersHint")} · {t("overview.legendIncome")}:{" "}
        {formatMoney(budgetLayers.income, currency, locale)}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {(
          [
            ["essential", t("limits.layerEssential")],
            ["personal", t("limits.layerPersonal")],
            ["future", t("limits.layerFuture")],
          ] as const
        ).map(([key, label]) => (
          <LayerBar
            key={key}
            title={label}
            progress={budgetLayers.byLayer[key]}
            currency={currency}
            locale={locale}
            overLabel={t("limits.over")}
            remainingLabel={t("limits.remaining")}
          />
        ))}
      </div>
      {budgetLayers.unmappedExpense > 0 ? (
        <p className="mt-3 text-xs text-muted">
          {t("limits.unmapped")}:{" "}
          {formatMoney(budgetLayers.unmappedExpense, currency, locale)}
        </p>
      ) : null}
    </section>
  );
}

function LayerBar({
  title,
  progress,
  currency,
  locale,
  overLabel,
  remainingLabel,
}: {
  title: string;
  progress: ProgressSnapshot;
  currency: string;
  locale: string;
  overLabel: string;
  remainingLabel: string;
}) {
  const ratio = Math.min(progress.ratio, 1);
  const over = progress.overBy > 0;
  return (
    <article className="rounded-md border border-border bg-bg p-3">
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
