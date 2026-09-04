import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import {
  currentMonthValue,
  formatEntryDate,
  formatMoney,
  shiftMonth,
} from "../../shared/lib/money";
import { ListRowsSkeleton, Skeleton } from "../../shared/ui/Skeleton";
import { fetchSharedEntries } from "../entries/entry-api";
import { fetchSpaceMonth } from "../spaces/space-api";
import { useActiveSpace } from "../spaces/use-active-space";

export function SpacePage() {
  const { t, locale } = useLocale();
  const { spacesQuery, spaces, activeSpace, spaceId, selectSpace } =
    useActiveSpace();
  const [month, setMonth] = useState(currentMonthValue);
  const transparent = activeSpace?.privacyMode === "transparent";

  const sharedQuery = useQuery({
    queryKey: ["entries-shared", spaceId, month, activeSpace?.privacyMode],
    queryFn: () => fetchSharedEntries(spaceId!, month),
    enabled: Boolean(spaceId),
  });

  const spaceMonthQuery = useQuery({
    queryKey: ["space-month", spaceId, month],
    queryFn: () => fetchSpaceMonth(spaceId!, month),
    enabled: Boolean(spaceId),
  });

  if (spacesQuery.isLoading) {
    return (
      <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
        <header>
          <Skeleton className="h-9 w-36" />
          <Skeleton className="mt-2 h-4 w-72" />
        </header>
        <ListRowsSkeleton />
      </main>
    );
  }

  if (!spaceId || !activeSpace) {
    return (
      <main className="px-6 py-8 md:px-10">
        <h1 className="text-3xl font-semibold text-fg">{t("space.title")}</h1>
        <p className="mt-3 text-muted">{t("me.noSpace")}</p>
      </main>
    );
  }

  const spaceLimit = spaceMonthQuery.data?.spaceLimit;
  const pageLoading = sharedQuery.isLoading || spaceMonthQuery.isLoading;

  return (
    <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-fg">{t("space.title")}</h1>
          <p className="mt-1 text-sm text-muted">
            {transparent ? t("space.transparentHint") : t("space.sharedHint")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {spaces.length > 1 ? (
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg"
              value={spaceId}
              onChange={(event) => selectSpace(event.target.value)}
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
            onClick={() => setMonth(shiftMonth(month, -1))}
          >
            ←
          </button>
          <span className="min-w-24 text-center text-sm font-medium text-fg">
            {month}
          </span>
          <button
            type="button"
            className="rounded-md border border-border px-2 py-1.5 text-sm text-fg"
            onClick={() => setMonth(shiftMonth(month, 1))}
          >
            →
          </button>
        </div>
      </header>

      {pageLoading ? (
        <ListRowsSkeleton />
      ) : (
        <>
          {transparent ? (
            <p className="rounded-md border border-accent/40 bg-income px-3 py-2 text-sm text-income-fg">
              {t("space.transparentBanner")}
            </p>
          ) : null}

          {spaceLimit?.progress ? (
            <article className="rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-medium text-fg">{t("limits.space")}</p>
              <p className="mt-1 text-sm tabular-nums text-muted">
                {formatMoney(
                  spaceLimit.progress.current,
                  activeSpace.currency,
                  locale
                )}{" "}
                /{" "}
                {formatMoney(
                  spaceLimit.progress.target,
                  activeSpace.currency,
                  locale
                )}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full ${
                    spaceLimit.progress.overBy > 0
                      ? "bg-expense-fg"
                      : "bg-accent"
                  }`}
                  style={{
                    width: `${Math.min(Math.max(spaceLimit.progress.ratio, 0), 1) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted">
                {spaceLimit.progress.overBy > 0
                  ? `${t("limits.over")}: ${formatMoney(spaceLimit.progress.overBy, activeSpace.currency, locale)}`
                  : `${t("limits.remaining")}: ${formatMoney(spaceLimit.progress.remaining, activeSpace.currency, locale)}`}
              </p>
            </article>
          ) : null}

          <section className="flex flex-col gap-2">
            {sharedQuery.data?.length === 0 ? (
              <p className="text-sm text-muted">
                {transparent ? t("space.emptyVisible") : t("space.emptyShared")}
              </p>
            ) : null}
            {sharedQuery.data?.map((entry) => (
              <article
                key={entry.id}
                className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-fg">
                    {entry.categoryName}
                    {entry.description ? (
                      <span className="font-normal text-muted">
                        {" "}
                        · {entry.description}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">
                    {formatEntryDate(
                      entry.occurredOn,
                      activeSpace.entryDateMode
                    )}{" "}
                    ·{" "}
                    {entry.type === "income"
                      ? t("me.income")
                      : entry.type === "saving"
                        ? t("me.kindSaving")
                        : t("me.expense")}{" "}
                    ·{" "}
                    {entry.visibility === "shared"
                      ? t("me.shared")
                      : t("me.personal")}
                    {transparent && entry.userName
                      ? ` · ${entry.userName}`
                      : null}
                  </p>
                </div>
                <p
                  className={`tabular-nums font-semibold ${
                    entry.type === "income"
                      ? "text-income-fg"
                      : entry.type === "saving"
                        ? "text-accent"
                        : "text-expense-fg"
                  }`}
                >
                  {formatMoney(entry.amount, activeSpace.currency, locale)}
                </p>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
