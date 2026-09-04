import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { OverviewRangePreset, OverviewScope } from "@homewallet/shared";
import { fetchSession } from "../auth/auth-api";
import { fetchSpaceMembers } from "../spaces/space-api";
import { useActiveSpace } from "../spaces/use-active-space";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { currentMonthValue, shiftMonth } from "../../shared/lib/money";
import { Skeleton } from "../../shared/ui/Skeleton";
import { fetchOverviewBreakdown, fetchOverviewSeries } from "./overview-api";
import { OverviewBudgetLayers } from "./OverviewBudgetLayers";
import { OverviewCategoryDonut } from "./OverviewCategoryDonut";
import { OverviewTrendChart } from "./OverviewTrendChart";

const RANGE_OPTIONS: OverviewRangePreset[] = ["3", "6", "12", "ytd"];

export function OverviewPage() {
  const { t } = useLocale();
  const { spacesQuery, spaces, activeSpace, spaceId, selectSpace } =
    useActiveSpace();
  const [range, setRange] = useState<OverviewRangePreset>("6");
  const [scope, setScope] = useState<OverviewScope>("me");
  const [memberUserId, setMemberUserId] = useState<string | undefined>();
  const [endMonth, setEndMonth] = useState(currentMonthValue);
  const [compositionMonth, setCompositionMonth] = useState(currentMonthValue);

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
  const transparent = activeSpace?.privacyMode === "transparent";
  const myUserId = sessionQuery.data?.user.id;
  const peers = members.filter((member) => member.userId !== myUserId);

  useEffect(() => {
    if (!multiMember) {
      setScope("me");
      setMemberUserId(undefined);
      return;
    }
    if (transparent) {
      setScope("everyone");
      setMemberUserId(undefined);
      return;
    }
    setScope("me");
    setMemberUserId(undefined);
  }, [spaceId, multiMember, transparent]);

  useEffect(() => {
    if (scope !== "member") {
      return;
    }
    const peerIds = members
      .filter((member) => member.userId !== myUserId)
      .map((member) => member.userId);
    if (!memberUserId || !peerIds.includes(memberUserId)) {
      setMemberUserId(peerIds[0]);
    }
  }, [scope, memberUserId, members, myUserId]);

  const scopeReady =
    Boolean(spaceId) &&
    (scope !== "member" || Boolean(memberUserId)) &&
    (scope === "me" ||
      scope === "shared" ||
      (transparent && (scope === "everyone" || scope === "member")));

  const seriesQuery = useQuery({
    queryKey: [
      "overview-series",
      spaceId,
      range,
      scope,
      memberUserId,
      endMonth,
    ],
    queryFn: () =>
      fetchOverviewSeries(spaceId!, {
        range,
        scope,
        memberUserId,
        endMonth,
      }),
    enabled: scopeReady,
  });

  const breakdownQuery = useQuery({
    queryKey: [
      "overview-breakdown",
      spaceId,
      compositionMonth,
      scope,
      memberUserId,
    ],
    queryFn: () =>
      fetchOverviewBreakdown(spaceId!, {
        month: compositionMonth,
        scope,
        memberUserId,
      }),
    enabled: scopeReady,
  });

  function onScopeSelectChange(value: string) {
    if (value.startsWith("member:")) {
      setScope("member");
      setMemberUserId(value.slice("member:".length));
      return;
    }
    setScope(value as OverviewScope);
    setMemberUserId(undefined);
  }

  const scopeSelectValue =
    scope === "member" && memberUserId ? `member:${memberUserId}` : scope;

  if (spacesQuery.isLoading) {
    return (
      <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
        <header>
          <Skeleton className="h-9 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </header>
        <Skeleton className="h-64 w-full rounded-lg" />
      </main>
    );
  }

  if (!spaceId || !activeSpace) {
    return (
      <main className="px-6 py-8 md:px-10">
        <h1 className="text-3xl font-semibold text-fg">
          {t("overview.title")}
        </h1>
        <p className="mt-3 text-muted">{t("me.noSpace")}</p>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-8 px-6 py-8 md:px-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-fg">
            {t("overview.title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("overview.hint")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {spaces.length > 1 ? (
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg"
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
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg"
            value={range}
            onChange={(event) =>
              setRange(event.target.value as OverviewRangePreset)
            }
            aria-label={t("overview.range")}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(
                  (
                    {
                      "3": "overview.range.3",
                      "6": "overview.range.6",
                      "12": "overview.range.12",
                      ytd: "overview.range.ytd",
                    } as const
                  )[option]
                )}
              </option>
            ))}
          </select>
          {multiMember ? (
            <select
              className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-fg"
              value={scopeSelectValue}
              onChange={(event) => onScopeSelectChange(event.target.value)}
              aria-label={t("overview.scope")}
            >
              <option value="me">{t("overview.scope.me")}</option>
              {transparent ? (
                <>
                  <option value="everyone">
                    {t("overview.scope.everyone")}
                  </option>
                  {peers.map((peer) => (
                    <option key={peer.userId} value={`member:${peer.userId}`}>
                      {peer.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value="shared">{t("overview.scope.shared")}</option>
              )}
            </select>
          ) : null}
        </div>
      </header>

      {seriesQuery.isLoading ? (
        <Skeleton className="h-72 w-full rounded-lg" />
      ) : seriesQuery.data ? (
        <OverviewTrendChart
          points={seriesQuery.data.points}
          includesIncome={seriesQuery.data.includesIncome}
          currency={activeSpace.currency}
          endMonth={endMonth}
          onEndMonthChange={setEndMonth}
          shiftMonth={shiftMonth}
        />
      ) : (
        <p className="text-sm text-muted">{t("overview.hint")}</p>
      )}

      {breakdownQuery.isLoading ? (
        <Skeleton className="h-64 w-full rounded-lg" />
      ) : breakdownQuery.data ? (
        <>
          <OverviewCategoryDonut
            slices={breakdownQuery.data.slices}
            totalExpense={breakdownQuery.data.totalExpense}
            currency={activeSpace.currency}
            month={compositionMonth}
            onMonthChange={setCompositionMonth}
            shiftMonth={shiftMonth}
          />
          {breakdownQuery.data.budgetLayers ? (
            <OverviewBudgetLayers
              budgetLayers={breakdownQuery.data.budgetLayers}
              currency={activeSpace.currency}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}
