import type { EntityManager } from "typeorm";
import { Membership } from "../db/entities/membership.entity.js";

export const membershipRepository = {
  findForUser(userId: string, manager: EntityManager) {
    return manager.find(Membership, {
      where: { userId },
      relations: { space: true },
      order: { space: { createdAt: "ASC" } },
    });
  },

  findMembership(userId: string, spaceId: string, manager: EntityManager) {
    return manager.findOne(Membership, {
      where: { userId, spaceId },
      relations: { space: true },
    });
  },

  listForSpace(spaceId: string, manager: EntityManager) {
    return manager.find(Membership, {
      where: { spaceId },
      relations: { user: true },
      order: { createdAt: "ASC" },
    });
  },

  countOwners(spaceId: string, manager: EntityManager) {
    return manager.count(Membership, {
      where: { spaceId, role: "owner" },
    });
  },

  create(manager: EntityManager, fields: Partial<Membership>) {
    return manager.save(manager.create(Membership, fields));
  },

  save(manager: EntityManager, membership: Membership) {
    return manager.save(membership);
  },

  remove(manager: EntityManager, membership: Membership) {
    return manager.remove(membership);
  },
};
