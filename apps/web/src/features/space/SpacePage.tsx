import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import {
  currentMonthValue,
  formatEntryDate,
  formatMoney,
  shiftMonth,
} from "../../shared/lib/money";
import { fetchSharedEntries } from "../entries/entry-api";
import { useActiveSpace } from "../spaces/use-active-space";

export function SpacePage() {
  const { t, locale } = useLocale();
  const { spaces, activeSpace, spaceId, selectSpace } = useActiveSpace();
  const [month, setMonth] = useState(currentMonthValue);

  const sharedQuery = useQuery({
    queryKey: ["entries-shared", spaceId, month],
    queryFn: () => fetchSharedEntries(spaceId!, month),
    enabled: Boolean(spaceId),
  });

  if (!spaceId || !activeSpace) {
    return (
      <main className="px-6 py-8 md:px-10">
        <h1 className="text-3xl font-semibold text-fg">{t("space.title")}</h1>
        <p className="mt-3 text-muted">{t("me.noSpace")}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-fg">{t("space.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("space.sharedHint")}</p>
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

      <section className="flex flex-col gap-2">
        {sharedQuery.data?.length === 0 ? (
          <p className="text-sm text-muted">{t("space.emptyShared")}</p>
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
                {formatEntryDate(entry.occurredOn, activeSpace.entryDateMode)} ·{" "}
                {entry.type === "income" ? t("me.income") : t("me.expense")}
              </p>
            </div>
            <p
              className={`tabular-nums font-semibold ${
                entry.type === "income" ? "text-income-fg" : "text-expense-fg"
              }`}
            >
              {formatMoney(entry.amount, activeSpace.currency, locale)}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
