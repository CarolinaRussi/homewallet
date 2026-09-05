import type { DataSource } from "typeorm";
import type {
  CreateLeftoverSeedBody,
  CreateReserveMovementBody,
  LeftoverSeedSummary,
  MonthSummary,
  ReserveMovementSummary,
} from "@homewallet/shared";
import {
  allocateExpenseToCategories,
  layerTargets,
  progressToward,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { monthBounds } from "../lib/entry-mappers.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { leftoverSeedRepository } from "../repositories/leftover-seed.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { reserveMovementRepository } from "../repositories/reserve-movement.repository.js";
import { reservePotRepository } from "../repositories/reserve-pot.repository.js";
import type { MonthSnapshotService } from "./month-snapshot.service.js";
import {
  buildFlowBuckets,
  computeSnapshotCore,
  monthKeyFromDate,
  toMovementSummary,
  toSeedSummary,
} from "./month-snapshot.build.js";
import type { RecurringService } from "./recurring.service.js";
import { buildPotSummaries } from "./reserve-pot.service.js";
import type { ReservePotService } from "./reserve-pot.service.js";

function withdrawEntryToMovementSummary(entry: {
  id: string;
  amount: string | number;
  description: string;
  occurredOn: string;
  reservePotId: string | null;
  reservePot?: { name: string } | null;
}): ReserveMovementSummary {
  return {
    id: entry.id,
    type: "withdraw",
    amount: Number(entry.amount),
    description: entry.description,
    occurredOn: entry.occurredOn,
    reservePotId: entry.reservePotId,
    reservePotName: entry.reservePot?.name ?? null,
  };
}

function amountOrNull(value: string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }
  return Number(value);
}

export function createLeftoverService(
  dataSource: DataSource,
  recurringService: RecurringService,
  reservePotService: ReservePotService,
  monthSnapshotService: MonthSnapshotService
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

  async function loadSummary(
    userId: string,
    spaceId: string,
    month: string
  ): Promise<MonthSummary> {
    const membership = await requireMember(userId, spaceId);
    const { start, end } = monthBounds(month);
    await reservePotService.ensureDefaults(userId, spaceId);

    const [snapshotCore, movements, seeds, monthEntries] = await Promise.all([
      monthSnapshotService.findCoreForMonth(spaceId, userId, month),
      reserveMovementRepository.listForUserThrough(
        spaceId,
        userId,
        end,
        dataSource.manager
      ),
      leftoverSeedRepository.listForUserThrough(
        spaceId,
        userId,
        end,
        dataSource.manager
      ),
      entryRepository.listMineForMonth(
        spaceId,
        userId,
        start,
        end,
        dataSource.manager
      ),
    ]);

    let core = snapshotCore;
    if (!core) {
      const [entries, allMovements, allSeeds, pots] = await Promise.all([
        entryRepository.listMineThroughLight(
          spaceId,
          userId,
          end,
          dataSource.manager
        ),
        reserveMovementRepository.listForUserThrough(
          spaceId,
          userId,
          end,
          dataSource.manager
        ),
        leftoverSeedRepository.listForUserThrough(
          spaceId,
          userId,
          end,
          dataSource.manager
        ),
        reservePotRepository.listForUser(spaceId, userId, dataSource.manager),
      ]);
      const buckets = buildFlowBuckets(entries, allMovements, allSeeds);
      const seedSummaries = allSeeds.map(toSeedSummary);
      core = computeSnapshotCore(
        month,
        buckets,
        allMovements,
        seedSummaries,
        entries,
        pots
      );
      const backfillFrom = buckets.reduce(
        (earliest, bucket) =>
          bucket.month < earliest ? bucket.month : earliest,
        month
      );
      if (!monthSnapshotService.isStale(spaceId, userId, backfillFrom)) {
        monthSnapshotService.touch(userId, spaceId, backfillFrom);
      }
    }

    const stale = monthSnapshotService.isStale(spaceId, userId, month);
    const seedSummaries = seeds.map(toSeedSummary);
    const legacyMovements = movements
      .map(toMovementSummary)
      .filter((movement) => monthKeyFromDate(movement.occurredOn) === month)
      .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn));
    const entryWithdraws = monthEntries
      .filter((entry) => entry.type === "reserve_withdraw")
      .map(withdrawEntryToMovementSummary);
    const monthMovements = [...legacyMovements, ...entryWithdraws].sort(
      (left, right) => right.occurredOn.localeCompare(left.occurredOn)
    );

    const personalAmount = amountOrNull(membership.personalLimitAmount);
    const leftoverAmount = amountOrNull(membership.leftoverTargetAmount);

    const myLimits = {
      personalLimitEnabled: membership.personalLimitEnabled,
      personalLimitAmount: personalAmount,
      leftoverTargetEnabled: membership.leftoverTargetEnabled,
      leftoverTargetAmount: leftoverAmount,
    };

    let budgetLayers = null;
    if (membership.space.budgetLayersEnabled) {
      const spent = {
        essential: 0,
        personal: 0,
        future: 0,
      };
      let unmappedExpense = 0;

      function addToLayer(amount: number, layer: string | null | undefined) {
        if (
          layer === "essential" ||
          layer === "personal" ||
          layer === "future"
        ) {
          spent[layer] += amount;
        } else {
          unmappedExpense += amount;
        }
      }

      for (const entry of monthEntries) {
        if (
          entry.type !== "expense" &&
          entry.type !== "transfer_out" &&
          entry.type !== "saving"
        ) {
          continue;
        }
        if (!entry.categoryId) {
          addToLayer(Number(entry.amount), null);
          continue;
        }
        const lines = entry.type === "expense" ? (entry.cardLines ?? []) : [];
        const layerByCategoryId = new Map<string, string | null>();
        layerByCategoryId.set(
          entry.categoryId,
          entry.category?.budgetLayer ?? null
        );
        for (const line of lines) {
          layerByCategoryId.set(
            line.categoryId,
            line.category?.budgetLayer ?? null
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
          addToLayer(slice.amount, layerByCategoryId.get(slice.categoryId));
        }
      }
      const targets = layerTargets(core.income);
      budgetLayers = {
        enabled: true as const,
        income: core.income,
        byLayer: {
          essential: progressToward(spent.essential, targets.essential),
          personal: progressToward(spent.personal, targets.personal),
          future: progressToward(spent.future, targets.future),
        },
        unmappedExpense,
      };
    }

    return {
      month: core.month,
      income: core.income,
      expense: core.expense,
      contributed: core.contributed,
      withdrawn: core.withdrawn,
      carriedIn: core.carriedIn,
      leftover: core.leftover,
      reserveBalance: core.reserveBalance,
      pots: core.pots,
      movements: monthMovements,
      leftoverSeeds: seedSummaries
        .filter((seed) => monthKeyFromDate(seed.occurredOn) === month)
        .sort((left, right) => right.occurredOn.localeCompare(left.occurredOn)),
      myLimits,
      personalLimit:
        myLimits.personalLimitEnabled && personalAmount != null
          ? progressToward(core.expense, personalAmount)
          : null,
      leftoverTarget:
        myLimits.leftoverTargetEnabled && leftoverAmount != null
          ? progressToward(core.leftover, leftoverAmount)
          : null,
      budgetLayers,
      stale: stale || undefined,
    };
  }

  return {
    async getMonthSummary(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<MonthSummary> {
      const materialized = await recurringService.ensureThrough(
        userId,
        spaceId,
        month
      );
      if (materialized) {
        monthSnapshotService.touch(userId, spaceId, month);
      }
      return loadSummary(userId, spaceId, month);
    },

    async createMovement(
      userId: string,
      spaceId: string,
      input: CreateReserveMovementBody
    ): Promise<ReserveMovementSummary> {
      await requireMember(userId, spaceId);
      await reservePotService.requireOwnPot(
        userId,
        spaceId,
        input.reservePotId
      );

      if (input.type === "withdraw") {
        const [entries, movements, pots] = await Promise.all([
          entryRepository.listMineThroughLight(
            spaceId,
            userId,
            input.occurredOn,
            dataSource.manager
          ),
          reserveMovementRepository.listForUserThrough(
            spaceId,
            userId,
            input.occurredOn,
            dataSource.manager
          ),
          reservePotRepository.listForUser(spaceId, userId, dataSource.manager),
        ]);
        const potSummaries = buildPotSummaries(
          pots,
          entries,
          movements,
          input.occurredOn
        );
        const pot = potSummaries.find((item) => item.id === input.reservePotId);
        if (!pot || input.amount > pot.balance + 1e-9) {
          throw new HttpError(400, "Not enough balance in this pot");
        }

        const category = await categoryRepository.ensureSavingCategory(
          spaceId,
          dataSource.manager
        );
        const entry = await entryRepository.create(dataSource.manager, {
          spaceId,
          userId,
          categoryId: category.id,
          type: "reserve_withdraw",
          amount: input.amount.toFixed(2),
          description: input.description,
          visibility: "personal",
          occurredOn: input.occurredOn,
          recurringRuleId: null,
          installmentPlanId: null,
          installmentNumber: null,
          reservePotId: input.reservePotId,
          transferGroupId: null,
          counterpartyUserId: null,
        });
        await monthSnapshotService.touch(
          userId,
          spaceId,
          monthKeyFromDate(input.occurredOn)
        );
        const loaded = await entryRepository.findById(
          entry.id,
          dataSource.manager
        );
        if (!loaded) {
          throw new HttpError(500, "Failed to load reserve withdraw");
        }
        return withdrawEntryToMovementSummary(loaded);
      }

      const movement = await reserveMovementRepository.create(
        dataSource.manager,
        {
          spaceId,
          userId,
          type: input.type,
          amount: input.amount.toFixed(2),
          description: input.description,
          occurredOn: input.occurredOn,
          reservePotId: input.reservePotId,
        }
      );
      await monthSnapshotService.touch(
        userId,
        spaceId,
        monthKeyFromDate(input.occurredOn)
      );
      const loaded = await reserveMovementRepository.findById(
        movement.id,
        dataSource.manager
      );
      if (!loaded) {
        throw new HttpError(500, "Failed to load reserve movement");
      }
      return toMovementSummary(loaded);
    },

    async removeMovement(userId: string, movementId: string) {
      const movement = await reserveMovementRepository.findById(
        movementId,
        dataSource.manager
      );
      if (movement) {
        if (movement.userId !== userId) {
          throw new HttpError(
            403,
            "You can only delete your own reserve movements"
          );
        }
        await requireMember(userId, movement.spaceId);
        await reserveMovementRepository.remove(dataSource.manager, movement);
        await monthSnapshotService.touch(
          userId,
          movement.spaceId,
          monthKeyFromDate(movement.occurredOn)
        );
        return;
      }

      const entry = await entryRepository.findById(
        movementId,
        dataSource.manager
      );
      if (!entry || entry.type !== "reserve_withdraw") {
        throw new HttpError(404, "Reserve movement not found");
      }
      if (entry.userId !== userId) {
        throw new HttpError(
          403,
          "You can only delete your own reserve movements"
        );
      }
      await requireMember(userId, entry.spaceId);
      await entryRepository.remove(dataSource.manager, entry);
      await monthSnapshotService.touch(
        userId,
        entry.spaceId,
        monthKeyFromDate(entry.occurredOn)
      );
    },

    async createLeftoverSeed(
      userId: string,
      spaceId: string,
      input: CreateLeftoverSeedBody
    ): Promise<LeftoverSeedSummary> {
      await requireMember(userId, spaceId);
      const seed = await leftoverSeedRepository.create(dataSource.manager, {
        spaceId,
        userId,
        amount: input.amount.toFixed(2),
        description: input.description,
        occurredOn: input.occurredOn,
      });
      await monthSnapshotService.touch(
        userId,
        spaceId,
        monthKeyFromDate(input.occurredOn)
      );
      return {
        id: seed.id,
        amount: Number(seed.amount),
        description: seed.description,
        occurredOn: seed.occurredOn,
      };
    },

    async removeLeftoverSeed(userId: string, seedId: string) {
      const seed = await leftoverSeedRepository.findById(
        seedId,
        dataSource.manager
      );
      if (!seed) {
        throw new HttpError(404, "Leftover opening not found");
      }
      if (seed.userId !== userId) {
        throw new HttpError(
          403,
          "You can only delete your own leftover openings"
        );
      }
      await requireMember(userId, seed.spaceId);
      await leftoverSeedRepository.remove(dataSource.manager, seed);
      await monthSnapshotService.touch(
        userId,
        seed.spaceId,
        monthKeyFromDate(seed.occurredOn)
      );
    },
  };
}

export type LeftoverService = ReturnType<typeof createLeftoverService>;
