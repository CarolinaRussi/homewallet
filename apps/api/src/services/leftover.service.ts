import type { DataSource } from "typeorm";
import type {
  CreateLeftoverSeedBody,
  CreateReserveMovementBody,
  LeftoverSeedSummary,
  MonthFlowBucket,
  MonthSummary,
  ReserveMovementSummary,
} from "@homewallet/shared";
import {
  allocateExpenseToCategories,
  computeMonthSummary,
  layerTargets,
  progressToward,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { monthBounds } from "../lib/entry-mappers.js";
import { LeftoverSeed } from "../db/entities/leftover-seed.entity.js";
import { ReserveMovement } from "../db/entities/reserve-movement.entity.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { leftoverSeedRepository } from "../repositories/leftover-seed.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { reserveMovementRepository } from "../repositories/reserve-movement.repository.js";
import { reservePotRepository } from "../repositories/reserve-pot.repository.js";
import type { RecurringService } from "./recurring.service.js";
import { buildPotSummaries } from "./reserve-pot.service.js";
import type { ReservePotService } from "./reserve-pot.service.js";

function toMovementSummary(movement: ReserveMovement): ReserveMovementSummary {
  return {
    id: movement.id,
    type: movement.type,
    amount: Number(movement.amount),
    description: movement.description,
    occurredOn: movement.occurredOn,
    reservePotId: movement.reservePotId,
    reservePotName: movement.reservePot?.name ?? null,
  };
}

function toSeedSummary(seed: LeftoverSeed): LeftoverSeedSummary {
  return {
    id: seed.id,
    amount: Number(seed.amount),
    description: seed.description,
    occurredOn: seed.occurredOn,
  };
}

function monthKey(occurredOn: string) {
  return occurredOn.slice(0, 7);
}

function amountOrNull(value: string | null | undefined) {
  if (value == null || value === "") {
    return null;
  }
  return Number(value);
}

function buildBuckets(
  entries: { type: string; amount: string; occurredOn: string }[],
  movements: ReserveMovement[],
  seeds: LeftoverSeed[]
): MonthFlowBucket[] {
  const byMonth = new Map<string, MonthFlowBucket>();

  function bucketFor(month: string) {
    let bucket = byMonth.get(month);
    if (!bucket) {
      bucket = {
        month,
        income: 0,
        expense: 0,
        contributed: 0,
        withdrawn: 0,
        openingLeftover: 0,
      };
      byMonth.set(month, bucket);
    }
    return bucket;
  }

  for (const entry of entries) {
    const bucket = bucketFor(monthKey(entry.occurredOn));
    const amount = Number(entry.amount);
    if (entry.type === "income" || entry.type === "transfer_in") {
      bucket.income += amount;
    } else if (entry.type === "expense" || entry.type === "transfer_out") {
      bucket.expense += amount;
    } else if (entry.type === "saving") {
      bucket.contributed += amount;
    }
  }

  for (const movement of movements) {
    const bucket = bucketFor(monthKey(movement.occurredOn));
    const amount = Number(movement.amount);
    if (movement.type === "contribute") {
      bucket.contributed += amount;
    } else if (movement.type === "withdraw") {
      bucket.withdrawn += amount;
    }
  }

  for (const seed of seeds) {
    bucketFor(monthKey(seed.occurredOn)).openingLeftover += Number(seed.amount);
  }

  return [...byMonth.values()];
}

export function createLeftoverService(
  dataSource: DataSource,
  recurringService: RecurringService,
  reservePotService: ReservePotService
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

    const [entries, movements, seeds, monthEntries, pots] = await Promise.all([
      entryRepository.listMineThrough(spaceId, userId, end, dataSource.manager),
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
      reservePotRepository.listForUser(spaceId, userId, dataSource.manager),
    ]);

    const savingThroughTarget = entries.reduce((sum, entry) => {
      return entry.type === "saving" ? sum + Number(entry.amount) : sum;
    }, 0);
    const potSummaries = buildPotSummaries(pots, entries, movements, end);

    const summary = computeMonthSummary(
      month,
      buildBuckets(entries, movements, seeds),
      movements.map(toMovementSummary),
      seeds.map(toSeedSummary),
      savingThroughTarget,
      potSummaries
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
        if (entry.type !== "expense" && entry.type !== "transfer_out") {
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
      const targets = layerTargets(summary.income);
      budgetLayers = {
        enabled: true as const,
        income: summary.income,
        byLayer: {
          essential: progressToward(spent.essential, targets.essential),
          personal: progressToward(spent.personal, targets.personal),
          future: progressToward(spent.future, targets.future),
        },
        unmappedExpense,
      };
    }

    return {
      ...summary,
      myLimits,
      personalLimit:
        myLimits.personalLimitEnabled && personalAmount != null
          ? progressToward(summary.expense, personalAmount)
          : null,
      leftoverTarget:
        myLimits.leftoverTargetEnabled && leftoverAmount != null
          ? progressToward(summary.leftover, leftoverAmount)
          : null,
      budgetLayers,
    };
  }

  return {
    async getMonthSummary(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<MonthSummary> {
      await requireMember(userId, spaceId);
      await recurringService.ensureThrough(userId, spaceId, month);
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
          entryRepository.listMineThrough(
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
      if (!movement) {
        throw new HttpError(404, "Reserve movement not found");
      }
      if (movement.userId !== userId) {
        throw new HttpError(
          403,
          "You can only delete your own reserve movements"
        );
      }
      await requireMember(userId, movement.spaceId);
      await reserveMovementRepository.remove(dataSource.manager, movement);
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
      return toSeedSummary(seed);
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
    },
  };
}

export type LeftoverService = ReturnType<typeof createLeftoverService>;
