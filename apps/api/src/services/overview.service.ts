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
  buildCategoryBreakdown,
  buildOverviewSeries,
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
      const nameByCategoryId = new Map<string, string>();
      nameByCategoryId.set(
        entry.categoryId,
        entry.category?.name ?? entry.categoryId
      );
      for (const line of lines) {
        nameByCategoryId.set(
          line.categoryId,
          line.category?.name ?? line.categoryId
        );
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
        amounts.push({
          categoryId: slice.categoryId,
          name: nameByCategoryId.get(slice.categoryId) ?? slice.categoryId,
          amount: slice.amount,
        });
      }
    }

    return amounts;
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

      const { totalExpense, slices } = buildCategoryBreakdown(
        collectCategoryAmounts(entries, scope)
      );

      return {
        month,
        scope,
        memberUserId,
        totalExpense,
        slices,
      };
    },
  };
}

export type OverviewService = ReturnType<typeof createOverviewService>;
