import type { DataSource } from "typeorm";
import type {
  CreateLeftoverSeedBody,
  CreateReserveMovementBody,
  LeftoverSeedSummary,
  MonthFlowBucket,
  MonthSummary,
  ReserveMovementSummary,
} from "@homewallet/shared";
import { computeMonthSummary, reserveBalanceDelta } from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { monthBounds } from "../lib/entry-mappers.js";
import { LeftoverSeed } from "../db/entities/leftover-seed.entity.js";
import { ReserveMovement } from "../db/entities/reserve-movement.entity.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { leftoverSeedRepository } from "../repositories/leftover-seed.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { reserveMovementRepository } from "../repositories/reserve-movement.repository.js";
import type { RecurringService } from "./recurring.service.js";

function toMovementSummary(movement: ReserveMovement): ReserveMovementSummary {
  return {
    id: movement.id,
    type: movement.type,
    amount: Number(movement.amount),
    description: movement.description,
    occurredOn: movement.occurredOn,
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
    if (entry.type === "income") {
      bucket.income += amount;
    } else if (entry.type === "expense") {
      bucket.expense += amount;
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

  async function loadSummary(
    userId: string,
    spaceId: string,
    month: string
  ): Promise<MonthSummary> {
    const { end } = monthBounds(month);
    const [entries, movements, seeds] = await Promise.all([
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
    ]);

    return computeMonthSummary(
      month,
      buildBuckets(entries, movements, seeds),
      movements.map(toMovementSummary),
      seeds.map(toSeedSummary)
    );
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

      if (input.type === "withdraw") {
        const priorMovements =
          await reserveMovementRepository.listForUserThrough(
            spaceId,
            userId,
            input.occurredOn,
            dataSource.manager
          );
        const available = priorMovements.reduce((sum, movement) => {
          return (
            sum + reserveBalanceDelta(movement.type, Number(movement.amount))
          );
        }, 0);
        if (input.amount > available + 1e-9) {
          throw new HttpError(400, "Not enough reserve balance");
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
        }
      );
      return toMovementSummary(movement);
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
