import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { currentMonthValue, shiftMonth } from "../../shared/lib/money";
import { ListRowsSkeleton, Skeleton } from "../../shared/ui/Skeleton";
import { fetchSession } from "../auth/auth-api";
import { fetchSharedEntries } from "../entries/entry-api";
import { fetchOverviewBreakdown } from "../overview/overview-api";
import { fetchSpaceMembers, fetchSpaceMonth } from "../spaces/space-api";
import { useActiveSpace } from "../spaces/use-active-space";
import { spaceDashboardScope } from "./space-dashboard-scope";
import { SpaceCategoryBars } from "./SpaceCategoryBars";
import { SpaceEntryList } from "./SpaceEntryList";
import { SpaceLimitCard } from "./SpaceLimitCard";
import { SpaceMonthHero } from "./SpaceMonthHero";

export function SpacePage() {
  const { t } = useLocale();
  const { spacesQuery, spaces, activeSpace, spaceId, selectSpace } =
    useActiveSpace();
  const [month, setMonth] = useState(currentMonthValue);
  const transparent = activeSpace?.privacyMode === "transparent";

  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
  });

  const membersQuery = useQuery({
    queryKey: ["space-members", spaceId],
    queryFn: () => fetchSpaceMembers(spaceId!),
    enabled: Boolean(spaceId),
  });

  const members = membersQuery.data ?? [];
  const multiMember = members.length > 1;
  const myUserId = sessionQuery.data?.user.id;
  const dashboardScope = activeSpace
    ? spaceDashboardScope(activeSpace.privacyMode, multiMember)
    : "me";

  const breakdownQuery = useQuery({
    queryKey: ["space-breakdown", spaceId, month, dashboardScope],
    queryFn: () =>
      fetchOverviewBreakdown(spaceId!, {
        month,
        scope: dashboardScope,
      }),
    enabled: Boolean(spaceId),
  });

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
        <Skeleton className="h-32 w-full rounded-lg" />
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

  const pageLoading =
    breakdownQuery.isLoading ||
    sharedQuery.isLoading ||
    spaceMonthQuery.isLoading;
  const pageRefreshing =
    (breakdownQuery.isFetching && !breakdownQuery.isLoading) ||
    (sharedQuery.isFetching && !sharedQuery.isLoading);

  const heroHint = transparent
    ? t("space.heroHintTransparent")
    : t("space.heroHintShared");

  return (
    <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-fg">{t("space.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("space.panelHint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {spaces.length > 1 ? (
            <select
              className="hw-select"
              value={spaceId}
              onChange={(event) => selectSpace(event.target.value)}
              aria-label={t("overview.space")}
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
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label={t("overview.nextMonth")}
          >
            →
          </button>
        </div>
      </header>

      {pageRefreshing ? (
        <p className="text-sm text-muted">{t("me.updating")}</p>
      ) : null}

      {pageLoading ? (
        <>
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <ListRowsSkeleton />
        </>
      ) : (
        <>
          {transparent ? (
            <p className="rounded-md border border-accent/40 bg-income px-3 py-2 text-sm text-income-fg">
              {t("space.transparentBanner")}
            </p>
          ) : null}

          <SpaceMonthHero
            totalExpense={breakdownQuery.data?.totalExpense ?? 0}
            month={month}
            currency={activeSpace.currency}
            hint={heroHint}
          />

          {spaceMonthQuery.data?.spaceLimit ? (
            <SpaceLimitCard
              spaceLimit={spaceMonthQuery.data.spaceLimit}
              currency={activeSpace.currency}
            />
          ) : null}

          <SpaceCategoryBars
            slices={breakdownQuery.data?.slices ?? []}
            currency={activeSpace.currency}
          />

          <p className="text-sm">
            <Link
              to="/overview"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              {t("space.viewTrend")} →
            </Link>
          </p>

          <SpaceEntryList
            entries={sharedQuery.data ?? []}
            members={members}
            myUserId={myUserId}
            multiMember={multiMember}
            transparent={transparent}
            currency={activeSpace.currency}
            entryDateMode={activeSpace.entryDateMode}
          />
        </>
      )}
    </main>
  );
}
