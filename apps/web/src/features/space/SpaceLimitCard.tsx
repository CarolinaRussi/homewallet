import type { SpaceLimitProgress } from "@homewallet/shared";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { formatMoney } from "../../shared/lib/money";

type SpaceLimitCardProps = {
  spaceLimit: SpaceLimitProgress;
  currency: string;
};

export function SpaceLimitCard({ spaceLimit, currency }: SpaceLimitCardProps) {
  const { t, locale } = useLocale();
  const progress = spaceLimit.progress;
  if (!spaceLimit.enabled || !progress) {
    return null;
  }

  const over = progress.overBy > 0;

  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-medium text-fg">{t("limits.space")}</p>
      <p className="mt-1 text-sm tabular-nums text-muted">
        {formatMoney(progress.current, currency, locale)} /{" "}
        {formatMoney(progress.target, currency, locale)}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${over ? "bg-expense-fg" : "bg-accent"}`}
          style={{
            width: `${Math.min(Math.max(progress.ratio, 0), 1) * 100}%`,
          }}
        />
      </div>
      <p className="mt-1 text-xs text-muted">
        {over
          ? `${t("limits.over")}: ${formatMoney(progress.overBy, currency, locale)}`
          : `${t("limits.remaining")}: ${formatMoney(progress.remaining, currency, locale)}`}
      </p>
    </article>
  );
}
