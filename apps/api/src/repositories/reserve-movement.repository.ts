import type { EntityManager } from "typeorm";
import { LessThanOrEqual } from "typeorm";
import { ReserveMovement } from "../db/entities/reserve-movement.entity.js";

export const reserveMovementRepository = {
  listForUserThrough(
    spaceId: string,
    userId: string,
    throughDate: string,
    manager: EntityManager
  ) {
    return manager.find(ReserveMovement, {
      where: {
        spaceId,
        userId,
        occurredOn: LessThanOrEqual(throughDate),
      },
      order: { occurredOn: "ASC", createdAt: "ASC" },
    });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(ReserveMovement, { where: { id } });
  },

  create(manager: EntityManager, fields: Partial<ReserveMovement>) {
    return manager.save(manager.create(ReserveMovement, fields));
  },

  remove(manager: EntityManager, movement: ReserveMovement) {
    return manager.remove(movement);
  },
};
