import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { OverviewRangePreset, OverviewScope } from "@homewallet/shared";
import { fetchSession } from "../auth/auth-api";
import { fetchSpaceMembers } from "../spaces/space-api";
import { useActiveSpace } from "../spaces/use-active-space";
import { useLocale } from "../../shared/lib/i18n/locale-context";
import { currentMonthValue, shiftMonth } from "../../shared/lib/money";
import { SelectField } from "../../shared/ui/SelectField";
import { Skeleton } from "../../shared/ui/Skeleton";
import { fetchOverviewBreakdown, fetchOverviewSeries } from "./overview-api";
import { OverviewBudgetLayers } from "./OverviewBudgetLayers";
import { OverviewCategoryDonut } from "./OverviewCategoryDonut";
import { OverviewScopeFilter } from "./OverviewScopeFilter";
import { OverviewTrendChart } from "./OverviewTrendChart";

const RANGE_OPTIONS: OverviewRangePreset[] = ["3", "6", "12", "ytd"];

export function OverviewPage() {
  const { t } = useLocale();
  const { spacesQuery, spaces, activeSpace, spaceId, selectSpace } =
    useActiveSpace();
  const [range, setRange] = useState<OverviewRangePreset>("6");
  const [scope, setScope] = useState<OverviewScope>("me");
  const [memberUserId, setMemberUserId] = useState<string | undefined>();
  const [compositionMonth, setCompositionMonth] = useState(currentMonthValue);
  const endMonth = currentMonthValue();

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

  function onScopeChange(nextScope: OverviewScope, nextMemberUserId?: string) {
    setScope(nextScope);
    setMemberUserId(nextScope === "member" ? nextMemberUserId : undefined);
  }

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
      <header>
        <h1 className="text-3xl font-semibold text-fg">
          {t("overview.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("overview.hint")}</p>
      </header>

      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-5">
        {multiMember ? (
          <OverviewScopeFilter
            transparent={transparent}
            scope={scope}
            memberUserId={memberUserId}
            peers={peers}
            onScopeChange={onScopeChange}
          />
        ) : null}

        <div
          className={`flex flex-wrap gap-4 ${multiMember ? "border-t border-border pt-4" : ""}`}
        >
          {spaces.length > 1 ? (
            <SelectField
              label={t("overview.space")}
              value={spaceId}
              onChange={(event) => selectSpace(event.target.value)}
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </SelectField>
          ) : null}
          <SelectField
            label={t("overview.range")}
            value={range}
            onChange={(event) =>
              setRange(event.target.value as OverviewRangePreset)
            }
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
          </SelectField>
        </div>
      </section>

      {seriesQuery.isLoading ? (
        <Skeleton className="h-72 w-full rounded-lg" />
      ) : seriesQuery.data ? (
        <OverviewTrendChart
          points={seriesQuery.data.points}
          includesIncome={seriesQuery.data.includesIncome}
          currency={activeSpace.currency}
          range={range}
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
