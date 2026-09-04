import type { EntityManager } from "typeorm";
import { DEFAULT_RESERVE_POT_NAME } from "@homewallet/shared";
import { ReservePot } from "../db/entities/reserve-pot.entity.js";

export const reservePotRepository = {
  listForUser(spaceId: string, userId: string, manager: EntityManager) {
    return manager.find(ReservePot, {
      where: { spaceId, userId },
      order: { createdAt: "ASC" },
    });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(ReservePot, { where: { id } });
  },

  findByName(
    spaceId: string,
    userId: string,
    name: string,
    manager: EntityManager
  ) {
    return manager.findOne(ReservePot, { where: { spaceId, userId, name } });
  },

  create(manager: EntityManager, fields: Partial<ReservePot>) {
    return manager.save(manager.create(ReservePot, fields));
  },

  save(manager: EntityManager, pot: ReservePot) {
    return manager.save(pot);
  },

  remove(manager: EntityManager, pot: ReservePot) {
    return manager.remove(pot);
  },

  async ensureDefault(spaceId: string, userId: string, manager: EntityManager) {
    const existing = await this.findByName(
      spaceId,
      userId,
      DEFAULT_RESERVE_POT_NAME,
      manager
    );
    if (existing) {
      return existing;
    }
    return this.create(manager, {
      spaceId,
      userId,
      name: DEFAULT_RESERVE_POT_NAME,
    });
  },
};
