import type { EntityManager } from "typeorm";
import { LessThanOrEqual } from "typeorm";
import { LeftoverSeed } from "../db/entities/leftover-seed.entity.js";

export const leftoverSeedRepository = {
  listForUserThrough(
    spaceId: string,
    userId: string,
    throughDate: string,
    manager: EntityManager
  ) {
    return manager.find(LeftoverSeed, {
      where: {
        spaceId,
        userId,
        occurredOn: LessThanOrEqual(throughDate),
      },
      order: { occurredOn: "ASC", createdAt: "ASC" },
    });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(LeftoverSeed, { where: { id } });
  },

  create(manager: EntityManager, fields: Partial<LeftoverSeed>) {
    return manager.save(manager.create(LeftoverSeed, fields));
  },

  remove(manager: EntityManager, seed: LeftoverSeed) {
    return manager.remove(seed);
  },
};
