import type { EntityManager } from "typeorm";
import { Membership } from "../db/entities/membership.entity.js";

export const membershipRepository = {
  findForUser(userId: string, manager: EntityManager) {
    return manager.find(Membership, {
      where: { userId },
      relations: { space: true },
    });
  },

  findMembership(userId: string, spaceId: string, manager: EntityManager) {
    return manager.findOne(Membership, {
      where: { userId, spaceId },
      relations: { space: true },
    });
  },

  create(manager: EntityManager, fields: Partial<Membership>) {
    return manager.save(manager.create(Membership, fields));
  },
};
