import type { DataSource } from "typeorm";
import type {
  OverviewRangePreset,
  OverviewScope,
  OverviewSeriesSummary,
} from "@homewallet/shared";
import {
  buildOverviewSeries,
  overviewFlowOptionsForScope,
  overviewRangeMonths,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { monthBounds } from "../lib/entry-mappers.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import type { RecurringService } from "./recurring.service.js";

export type OverviewSeriesInput = {
  range: OverviewRangePreset;
  scope: OverviewScope;
  memberUserId?: string;
  endMonth: string;
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

  return {
    async getSeries(
      userId: string,
      spaceId: string,
      input: OverviewSeriesInput
    ): Promise<OverviewSeriesSummary> {
      const membership = await requireMember(userId, spaceId);
      const privacyMode = membership.space.privacyMode;
      const { range, scope, endMonth } = input;

      if (
        (scope === "everyone" || scope === "member") &&
        privacyMode !== "transparent"
      ) {
        throw new HttpError(
          403,
          "This overview scope requires transparent privacy"
        );
      }

      let memberUserId: string | null = null;
      if (scope === "member") {
        if (!input.memberUserId) {
          throw new HttpError(
            400,
            "memberUserId is required when scope is member"
          );
        }
        const peerMembership = await membershipRepository.findMembership(
          input.memberUserId,
          spaceId,
          dataSource.manager
        );
        if (!peerMembership) {
          throw new HttpError(404, "Member not found in this space");
        }
        memberUserId = input.memberUserId;
      }

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
        await recurringService.ensureThrough(ensureUserId, spaceId, endMonth);
      }

      const listFilters =
        scope === "me"
          ? { userId }
          : scope === "member"
            ? { userId: memberUserId! }
            : scope === "shared"
              ? { visibility: "shared" as const }
              : undefined;

      const entries = await entryRepository.listForOverviewRange(
        spaceId,
        rangeStart,
        rangeEnd,
        dataSource.manager,
        listFilters
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
  };
}

export type OverviewService = ReturnType<typeof createOverviewService>;
