import type { DataSource } from "typeorm";
import type {
  CreateSpaceBody,
  SpaceMonthSummary,
  SpaceSummary,
  UpdateMyLimitsBody,
  UpdateSpaceBody,
} from "@homewallet/shared";
import { monthQuerySchema, progressToward } from "@homewallet/shared";
import { Membership } from "../db/entities/membership.entity.js";
import { HttpError } from "../lib/http-error.js";
import { monthBounds } from "../lib/entry-mappers.js";
import { createJoinCode } from "../lib/join-code.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { spaceRepository } from "../repositories/space.repository.js";
import { categoryRepository } from "../repositories/category.repository.js";

function amountOrNull(value: string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }
  return Number(value);
}

function toSummary(
  space: Membership["space"],
  role: Membership["role"]
): SpaceSummary {
  return {
    id: space.id,
    name: space.name,
    currency: space.currency,
    privacyMode: space.privacyMode,
    entryDateMode: space.entryDateMode,
    role,
    joinCode: space.joinCode,
    spaceLimitEnabled: space.spaceLimitEnabled,
    spaceLimitAmount: amountOrNull(space.spaceLimitAmount),
    budgetLayersEnabled: space.budgetLayersEnabled,
  };
}

function requirePositiveWhenEnabled(
  enabled: boolean | undefined,
  amount: number | null | undefined,
  label: string
) {
  if (enabled === true && (amount == null || !(amount > 0))) {
    throw new HttpError(400, `${label} amount is required when enabled`);
  }
}

export function createSpaceService(dataSource: DataSource) {
  return {
    async listForUser(userId: string): Promise<SpaceSummary[]> {
      const memberships = await membershipRepository.findForUser(
        userId,
        dataSource.manager
      );
      return memberships.map((membership) =>
        toSummary(membership.space, membership.role)
      );
    },

    async getForMember(userId: string, spaceId: string): Promise<SpaceSummary> {
      const membership = await membershipRepository.findMembership(
        userId,
        spaceId,
        dataSource.manager
      );
      if (!membership) {
        throw new HttpError(404, "Space not found");
      }
      return toSummary(membership.space, membership.role);
    },

    async createForOwner(
      userId: string,
      input: CreateSpaceBody,
      manager = dataSource.manager
    ): Promise<SpaceSummary> {
      // ponytail: retry once on join_code collision; unique index is the ceiling.
      let space;
      try {
        space = await spaceRepository.create(manager, {
          name: input.name,
          currency: input.currency ?? "BRL",
          privacyMode: "private",
          entryDateMode: input.entryDateMode ?? "month",
          spaceLimitEnabled: false,
          spaceLimitAmount: null,
          budgetLayersEnabled: false,
          joinCode: createJoinCode(),
        });
      } catch {
        space = await spaceRepository.create(manager, {
          name: input.name,
          currency: input.currency ?? "BRL",
          privacyMode: "private",
          entryDateMode: input.entryDateMode ?? "month",
          spaceLimitEnabled: false,
          spaceLimitAmount: null,
          budgetLayersEnabled: false,
          joinCode: createJoinCode(),
        });
      }

      await membershipRepository.create(manager, {
        userId,
        spaceId: space.id,
        role: "owner",
        personalLimitEnabled: false,
        personalLimitAmount: null,
        leftoverTargetEnabled: false,
        leftoverTargetAmount: null,
      });
      await categoryRepository.seedDefaults(space.id, manager);
      return toSummary(space, "owner");
    },

    async join(userId: string, joinCode: string): Promise<SpaceSummary> {
      const space = await spaceRepository.findByJoinCode(
        joinCode,
        dataSource.manager
      );
      if (!space) {
        throw new HttpError(404, "Space not found");
      }

      const existing = await membershipRepository.findMembership(
        userId,
        space.id,
        dataSource.manager
      );
      if (existing) {
        throw new HttpError(409, "Already a member of this space");
      }

      await membershipRepository.create(dataSource.manager, {
        userId,
        spaceId: space.id,
        role: "member",
        personalLimitEnabled: false,
        personalLimitAmount: null,
        leftoverTargetEnabled: false,
        leftoverTargetAmount: null,
      });
      return toSummary(space, "member");
    },

    async updateSettings(
      userId: string,
      spaceId: string,
      input: UpdateSpaceBody
    ): Promise<SpaceSummary> {
      const membership = await membershipRepository.findMembership(
        userId,
        spaceId,
        dataSource.manager
      );
      if (!membership) {
        throw new HttpError(404, "Space not found");
      }
      if (membership.role !== "owner") {
        throw new HttpError(403, "Only owners can change space settings");
      }

      const nextEnabled =
        input.spaceLimitEnabled ?? membership.space.spaceLimitEnabled;
      const nextAmount =
        input.spaceLimitAmount !== undefined
          ? input.spaceLimitAmount
          : amountOrNull(membership.space.spaceLimitAmount);
      requirePositiveWhenEnabled(nextEnabled, nextAmount, "Space limit");

      if (input.entryDateMode !== undefined) {
        membership.space.entryDateMode = input.entryDateMode;
      }
      if (input.spaceLimitEnabled !== undefined) {
        membership.space.spaceLimitEnabled = input.spaceLimitEnabled;
      }
      if (input.spaceLimitAmount !== undefined) {
        membership.space.spaceLimitAmount =
          input.spaceLimitAmount == null
            ? null
            : input.spaceLimitAmount.toFixed(2);
      }
      if (input.budgetLayersEnabled !== undefined) {
        membership.space.budgetLayersEnabled = input.budgetLayersEnabled;
      }
      if (!membership.space.spaceLimitEnabled) {
        membership.space.spaceLimitAmount = null;
      }

      await spaceRepository.save(dataSource.manager, membership.space);
      return toSummary(membership.space, membership.role);
    },

    async updateMyLimits(
      userId: string,
      spaceId: string,
      input: UpdateMyLimitsBody
    ): Promise<SpaceSummary> {
      const membership = await membershipRepository.findMembership(
        userId,
        spaceId,
        dataSource.manager
      );
      if (!membership) {
        throw new HttpError(404, "Space not found");
      }

      const nextPersonalEnabled =
        input.personalLimitEnabled ?? membership.personalLimitEnabled;
      const nextPersonalAmount =
        input.personalLimitAmount !== undefined
          ? input.personalLimitAmount
          : amountOrNull(membership.personalLimitAmount);
      requirePositiveWhenEnabled(
        nextPersonalEnabled,
        nextPersonalAmount,
        "Personal limit"
      );

      const nextLeftoverEnabled =
        input.leftoverTargetEnabled ?? membership.leftoverTargetEnabled;
      const nextLeftoverAmount =
        input.leftoverTargetAmount !== undefined
          ? input.leftoverTargetAmount
          : amountOrNull(membership.leftoverTargetAmount);
      requirePositiveWhenEnabled(
        nextLeftoverEnabled,
        nextLeftoverAmount,
        "Leftover target"
      );

      if (input.personalLimitEnabled !== undefined) {
        membership.personalLimitEnabled = input.personalLimitEnabled;
      }
      if (input.personalLimitAmount !== undefined) {
        membership.personalLimitAmount =
          input.personalLimitAmount == null
            ? null
            : input.personalLimitAmount.toFixed(2);
      }
      if (input.leftoverTargetEnabled !== undefined) {
        membership.leftoverTargetEnabled = input.leftoverTargetEnabled;
      }
      if (input.leftoverTargetAmount !== undefined) {
        membership.leftoverTargetAmount =
          input.leftoverTargetAmount == null
            ? null
            : input.leftoverTargetAmount.toFixed(2);
      }
      if (!membership.personalLimitEnabled) {
        membership.personalLimitAmount = null;
      }
      if (!membership.leftoverTargetEnabled) {
        membership.leftoverTargetAmount = null;
      }

      await membershipRepository.save(dataSource.manager, membership);
      return toSummary(membership.space, membership.role);
    },

    async getSpaceMonth(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<SpaceMonthSummary> {
      monthQuerySchema.parse(month);
      const membership = await membershipRepository.findMembership(
        userId,
        spaceId,
        dataSource.manager
      );
      if (!membership) {
        throw new HttpError(404, "Space not found");
      }

      const { start, end } = monthBounds(month);
      const sharedEntries = await entryRepository.listSharedForMonth(
        spaceId,
        start,
        end,
        dataSource.manager
      );
      const sharedExpense = sharedEntries.reduce((sum, entry) => {
        return entry.type === "expense" ? sum + Number(entry.amount) : sum;
      }, 0);

      const amount = amountOrNull(membership.space.spaceLimitAmount);
      const enabled = membership.space.spaceLimitEnabled;

      return {
        month,
        sharedExpense,
        spaceLimit: {
          enabled,
          amount,
          sharedExpense,
          progress:
            enabled && amount != null
              ? progressToward(sharedExpense, amount)
              : null,
        },
      };
    },
  };
}

export type SpaceService = ReturnType<typeof createSpaceService>;
