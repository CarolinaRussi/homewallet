import type { DataSource } from "typeorm";
import type {
  CreateReservePotBody,
  ReservePotSummary,
  UpdateReservePotBody,
} from "@homewallet/shared";
import { potBalanceFromFlows } from "@homewallet/shared";
import type { ReserveMovement } from "../db/entities/reserve-movement.entity.js";
import type { ReservePot } from "../db/entities/reserve-pot.entity.js";
import { HttpError } from "../lib/http-error.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { reserveMovementRepository } from "../repositories/reserve-movement.repository.js";
import { reservePotRepository } from "../repositories/reserve-pot.repository.js";

type FlowEntry = {
  type: string;
  amount: string;
  occurredOn: string;
  reservePotId: string | null;
};

export function buildPotSummaries(
  pots: ReservePot[],
  entries: FlowEntry[],
  movements: ReserveMovement[],
  throughDate: string
): ReservePotSummary[] {
  return pots.map((pot) => {
    let saved = 0;
    for (const entry of entries) {
      if (
        entry.type === "saving" &&
        entry.reservePotId === pot.id &&
        entry.occurredOn <= throughDate
      ) {
        saved += Number(entry.amount);
      }
    }

    let seeded = 0;
    let contributed = 0;
    let withdrawn = 0;
    for (const movement of movements) {
      if (
        movement.reservePotId !== pot.id ||
        movement.occurredOn > throughDate
      ) {
        continue;
      }
      const amount = Number(movement.amount);
      if (movement.type === "seed") {
        seeded += amount;
      } else if (movement.type === "contribute") {
        contributed += amount;
      } else if (movement.type === "withdraw") {
        withdrawn += amount;
      }
    }

    return {
      id: pot.id,
      name: pot.name,
      balance: potBalanceFromFlows({ saved, seeded, contributed, withdrawn }),
    };
  });
}

export function createReservePotService(dataSource: DataSource) {
  const throughAll = "9999-12-31";

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

  async function ensureDefaults(userId: string, spaceId: string) {
    await Promise.all([
      reservePotRepository.ensureDefault(spaceId, userId, dataSource.manager),
      categoryRepository.ensureSavingCategory(spaceId, dataSource.manager),
    ]);
  }

  async function loadPotSummaries(userId: string, spaceId: string) {
    const pots = await reservePotRepository.listForUser(
      spaceId,
      userId,
      dataSource.manager
    );
    const [entries, movements] = await Promise.all([
      entryRepository.listMineThrough(
        spaceId,
        userId,
        throughAll,
        dataSource.manager
      ),
      reserveMovementRepository.listForUserThrough(
        spaceId,
        userId,
        throughAll,
        dataSource.manager
      ),
    ]);
    return buildPotSummaries(pots, entries, movements, throughAll);
  }

  return {
    async list(userId: string, spaceId: string): Promise<ReservePotSummary[]> {
      await requireMember(userId, spaceId);
      await ensureDefaults(userId, spaceId);
      return loadPotSummaries(userId, spaceId);
    },

    async create(
      userId: string,
      spaceId: string,
      input: CreateReservePotBody
    ): Promise<ReservePotSummary> {
      await requireMember(userId, spaceId);
      const existing = await reservePotRepository.findByName(
        spaceId,
        userId,
        input.name,
        dataSource.manager
      );
      if (existing) {
        throw new HttpError(409, "Reserve pot already exists");
      }
      const pot = await reservePotRepository.create(dataSource.manager, {
        spaceId,
        userId,
        name: input.name,
      });
      return { id: pot.id, name: pot.name, balance: 0 };
    },

    async rename(
      userId: string,
      potId: string,
      input: UpdateReservePotBody
    ): Promise<ReservePotSummary> {
      const pot = await reservePotRepository.findById(
        potId,
        dataSource.manager
      );
      if (!pot) {
        throw new HttpError(404, "Reserve pot not found");
      }
      await requireMember(userId, pot.spaceId);
      if (pot.userId !== userId) {
        throw new HttpError(403, "You can only edit your own reserve pots");
      }

      const duplicate = await reservePotRepository.findByName(
        pot.spaceId,
        userId,
        input.name,
        dataSource.manager
      );
      if (duplicate && duplicate.id !== pot.id) {
        throw new HttpError(409, "Reserve pot already exists");
      }

      pot.name = input.name;
      await reservePotRepository.save(dataSource.manager, pot);

      const summaries = await loadPotSummaries(userId, pot.spaceId);
      const summary = summaries.find((item) => item.id === pot.id);
      return summary ?? { id: pot.id, name: pot.name, balance: 0 };
    },

    async remove(userId: string, potId: string): Promise<void> {
      const pot = await reservePotRepository.findById(
        potId,
        dataSource.manager
      );
      if (!pot) {
        throw new HttpError(404, "Reserve pot not found");
      }
      await requireMember(userId, pot.spaceId);
      if (pot.userId !== userId) {
        throw new HttpError(403, "You can only delete your own reserve pots");
      }

      const summaries = await loadPotSummaries(userId, pot.spaceId);
      const summary = summaries.find((item) => item.id === pot.id);
      if (summary && Math.abs(summary.balance) > 1e-9) {
        throw new HttpError(400, "Reserve pot balance must be zero to delete");
      }

      await reservePotRepository.remove(dataSource.manager, pot);
    },

    async requireOwnPot(userId: string, spaceId: string, potId: string) {
      const pot = await reservePotRepository.findById(
        potId,
        dataSource.manager
      );
      if (!pot || pot.spaceId !== spaceId || pot.userId !== userId) {
        throw new HttpError(400, "Reserve pot not found in this space");
      }
      return pot;
    },

    ensureDefaults,
    buildPotSummaries,
  };
}

export type ReservePotService = ReturnType<typeof createReservePotService>;
