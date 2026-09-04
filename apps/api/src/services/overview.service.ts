import type { DataSource } from "typeorm";
import type {
  OverviewBreakdownSummary,
  OverviewCategoryAmount,
  OverviewRangePreset,
  OverviewScope,
  OverviewSeriesSummary,
} from "@homewallet/shared";
import {
  allocateExpenseToCategories,
  buildBudgetLayersFromAmounts,
  buildCategoryBreakdown,
  buildOverviewSeries,
  overviewEntryDeltas,
  overviewFlowOptionsForScope,
  overviewRangeMonths,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { monthBounds } from "../lib/entry-mappers.js";
import type { Entry } from "../db/entities/entry.entity.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import type { RecurringService } from "./recurring.service.js";

export type OverviewSeriesInput = {
  range: OverviewRangePreset;
  scope: OverviewScope;
  memberUserId?: string;
  endMonth: string;
};

export type OverviewBreakdownInput = {
  month: string;
  scope: OverviewScope;
  memberUserId?: string;
};

export function createOverviewService(
  dataSource: DataSource,
  recurringService: RecurringService
) {
  async function requireMember(userId: string, spaceId: string) {
    const membership = await membershipRepository.findMembership(
      userId,
      spaceId,
      dataSource.manager
    );
    if (!membership) {
      throw new HttpError(404, "Space not found");
    }
    return membership;
  }

  async function resolveScopedMember(
    userId: string,
    spaceId: string,
    scope: OverviewScope,
    memberUserId: string | undefined,
    privacyMode: string
  ) {
    if (
      (scope === "everyone" || scope === "member") &&
      privacyMode !== "transparent"
    ) {
      throw new HttpError(
        403,
        "This overview scope requires transparent privacy"
      );
    }

    if (scope !== "member") {
      return null;
    }
    if (!memberUserId) {
      throw new HttpError(400, "memberUserId is required when scope is member");
    }
    const peerMembership = await membershipRepository.findMembership(
      memberUserId,
      spaceId,
      dataSource.manager
    );
    if (!peerMembership) {
      throw new HttpError(404, "Member not found in this space");
    }
    return memberUserId;
  }

  async function ensureRecurringForScope(
    userId: string,
    spaceId: string,
    scope: OverviewScope,
    memberUserId: string | null,
    throughMonth: string
  ) {
    const ensureUserIds = new Set<string>([userId]);
    if (scope === "member" && memberUserId) {
      ensureUserIds.add(memberUserId);
    }
    if (scope === "everyone" || scope === "shared") {
      const members = await membershipRepository.listForSpace(
        spaceId,
        dataSource.manager
      );
      for (const member of members) {
        ensureUserIds.add(member.userId);
      }
    }
    for (const ensureUserId of ensureUserIds) {
      await recurringService.ensureThrough(ensureUserId, spaceId, throughMonth);
    }
  }

  function listFiltersForScope(
    userId: string,
    scope: OverviewScope,
    memberUserId: string | null
  ) {
    if (scope === "me") {
      return { userId };
    }
    if (scope === "member") {
      return { userId: memberUserId! };
    }
    if (scope === "shared") {
      return { visibility: "shared" as const };
    }
    return undefined;
  }

  function collectCategoryAmounts(
    entries: Entry[],
    scope: OverviewScope
  ): OverviewCategoryAmount[] {
    const flowOptions = overviewFlowOptionsForScope(scope);
    const amounts: OverviewCategoryAmount[] = [];

    for (const entry of entries) {
      const isExpense = entry.type === "expense";
      const isTransferOut =
        entry.type === "transfer_out" && flowOptions.includeTransfers;
      if (!isExpense && !isTransferOut) {
        continue;
      }
      if (!entry.categoryId) {
        continue;
      }

      const lines = isExpense && entry.cardLines?.length ? entry.cardLines : [];
      const metaByCategoryId = new Map<
        string,
        { name: string; budgetLayer: OverviewCategoryAmount["budgetLayer"] }
      >();
      metaByCategoryId.set(entry.categoryId, {
        name: entry.category?.name ?? entry.categoryId,
        budgetLayer: entry.category?.budgetLayer ?? null,
      });
      for (const line of lines) {
        metaByCategoryId.set(line.categoryId, {
          name: line.category?.name ?? line.categoryId,
          budgetLayer: line.category?.budgetLayer ?? null,
        });
      }

      const slices = allocateExpenseToCategories({
        amount: Number(entry.amount),
        categoryId: entry.categoryId,
        cardLines: lines.map((line) => ({
          amount: Number(line.amount),
          categoryId: line.categoryId,
        })),
      });

      for (const slice of slices) {
        const meta = metaByCategoryId.get(slice.categoryId);
        amounts.push({
          categoryId: slice.categoryId,
          name: meta?.name ?? slice.categoryId,
          amount: slice.amount,
          budgetLayer: meta?.budgetLayer ?? null,
        });
      }
    }

    return amounts;
  }

  /** Saving entries count toward 50/40/10 (Future) but not the expense donut. */
  function collectSavingLayerAmounts(
    entries: Entry[]
  ): OverviewCategoryAmount[] {
    const amounts: OverviewCategoryAmount[] = [];
    for (const entry of entries) {
      if (entry.type !== "saving" || !entry.categoryId) {
        continue;
      }
      amounts.push({
        categoryId: entry.categoryId,
        name: entry.category?.name ?? entry.categoryId,
        amount: Number(entry.amount),
        budgetLayer: entry.category?.budgetLayer ?? "future",
      });
    }
    return amounts;
  }

  function scopedMonthIncome(entries: Entry[], scope: OverviewScope) {
    const flowOptions = overviewFlowOptionsForScope(scope);
    let income = 0;
    for (const entry of entries) {
      income += overviewEntryDeltas(
        entry.type,
        Number(entry.amount),
        flowOptions
      ).income;
    }
    return income;
  }

  return {
    async getSeries(
      userId: string,
      spaceId: string,
      input: OverviewSeriesInput
    ): Promise<OverviewSeriesSummary> {
      const membership = await requireMember(userId, spaceId);
      const { range, scope, endMonth } = input;
      const memberUserId = await resolveScopedMember(
        userId,
        spaceId,
        scope,
        input.memberUserId,
        membership.space.privacyMode
      );

      const months = overviewRangeMonths(endMonth, range);
      if (months.length === 0) {
        return {
          range,
          scope,
          memberUserId,
          endMonth,
          includesIncome: scope !== "shared",
          points: [],
        };
      }

      const rangeStart = monthBounds(months[0]!).start;
      const rangeEnd = monthBounds(months[months.length - 1]!).end;

      await ensureRecurringForScope(
        userId,
        spaceId,
        scope,
        memberUserId,
        endMonth
      );

      const entries = await entryRepository.listForOverviewRange(
        spaceId,
        rangeStart,
        rangeEnd,
        dataSource.manager,
        listFiltersForScope(userId, scope, memberUserId)
      );

      const flowOptions = overviewFlowOptionsForScope(scope);
      const points = buildOverviewSeries(
        months,
        entries.map((entry) => ({
          type: entry.type,
          amount: Number(entry.amount),
          occurredOn: entry.occurredOn,
        })),
        flowOptions
      );

      return {
        range,
        scope,
        memberUserId,
        endMonth,
        includesIncome: !flowOptions.expenseOnly,
        points,
      };
    },

    async getBreakdown(
      userId: string,
      spaceId: string,
      input: OverviewBreakdownInput
    ): Promise<OverviewBreakdownSummary> {
      const membership = await requireMember(userId, spaceId);
      const { month, scope } = input;
      const memberUserId = await resolveScopedMember(
        userId,
        spaceId,
        scope,
        input.memberUserId,
        membership.space.privacyMode
      );

      await ensureRecurringForScope(
        userId,
        spaceId,
        scope,
        memberUserId,
        month
      );

      const { start, end } = monthBounds(month);
      let entries: Entry[];
      if (scope === "me") {
        entries = await entryRepository.listMineForMonth(
          spaceId,
          userId,
          start,
          end,
          dataSource.manager
        );
      } else if (scope === "member") {
        entries = await entryRepository.listMineForMonth(
          spaceId,
          memberUserId!,
          start,
          end,
          dataSource.manager
        );
      } else if (scope === "shared") {
        entries = await entryRepository.listSharedForMonth(
          spaceId,
          start,
          end,
          dataSource.manager
        );
      } else {
        entries = await entryRepository.listAllForMonth(
          spaceId,
          start,
          end,
          dataSource.manager
        );
      }

      const categoryAmounts = collectCategoryAmounts(entries, scope);
      const { totalExpense, slices } = buildCategoryBreakdown(categoryAmounts);
      const budgetLayers = membership.space.budgetLayersEnabled
        ? buildBudgetLayersFromAmounts(
            [...categoryAmounts, ...collectSavingLayerAmounts(entries)],
            scopedMonthIncome(entries, scope)
          )
        : null;

      return {
        month,
        scope,
        memberUserId,
        totalExpense,
        slices,
        budgetLayers,
      };
    },
  };
}

export type OverviewService = ReturnType<typeof createOverviewService>;
