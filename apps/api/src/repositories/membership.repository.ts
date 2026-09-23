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

  countForSpace(spaceId: string, manager: EntityManager) {
    return manager.count(Membership, { where: { spaceId } });
  },

  async countBySpaceIds(spaceIds: string[], manager: EntityManager) {
    const counts = new Map<string, number>();
    if (spaceIds.length === 0) {
      return counts;
    }
    const rows = await manager
      .createQueryBuilder(Membership, "membershipRow")
      .select("membershipRow.spaceId", "spaceId")
      .addSelect("COUNT(*)", "memberCount")
      .where("membershipRow.spaceId IN (:...spaceIds)", { spaceIds })
      .groupBy("membershipRow.spaceId")
      .getRawMany<{ spaceId: string; memberCount: string }>();
    for (const row of rows) {
      counts.set(row.spaceId, Number(row.memberCount));
    }
    return counts;
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
