import type { DataSource } from "typeorm";
import type {
  CreateReserveMovementBody,
  MonthFlowBucket,
  MonthSummary,
  ReserveMovementSummary,
} from "@homewallet/shared";
import { computeMonthSummary } from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { monthBounds } from "../lib/entry-mappers.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { reserveMovementRepository } from "../repositories/reserve-movement.repository.js";
import { ReserveMovement } from "../db/entities/reserve-movement.entity.js";

function toMovementSummary(movement: ReserveMovement): ReserveMovementSummary {
  return {
    id: movement.id,
    type: movement.type,
    amount: Number(movement.amount),
    description: movement.description,
    occurredOn: movement.occurredOn,
  };
}

function monthKey(occurredOn: string) {
  return occurredOn.slice(0, 7);
}

function buildBuckets(
  entries: { type: string; amount: string; occurredOn: string }[],
  movements: ReserveMovement[]
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
    } else {
      bucket.withdrawn += amount;
    }
  }

  return [...byMonth.values()];
}

export function createLeftoverService(dataSource: DataSource) {
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
    const [entries, movements] = await Promise.all([
      entryRepository.listMineThrough(spaceId, userId, end, dataSource.manager),
      reserveMovementRepository.listForUserThrough(
        spaceId,
        userId,
        end,
        dataSource.manager
      ),
    ]);

    return computeMonthSummary(
      month,
      buildBuckets(entries, movements),
      movements.map(toMovementSummary)
    );
  }

  return {
    async getMonthSummary(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<MonthSummary> {
      await requireMember(userId, spaceId);
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
          const amount = Number(movement.amount);
          return movement.type === "contribute" ? sum + amount : sum - amount;
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
  };
}

export type LeftoverService = ReturnType<typeof createLeftoverService>;
