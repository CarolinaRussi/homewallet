import type { EntityManager } from "typeorm";
import { Between } from "typeorm";
import { Entry } from "../db/entities/entry.entity.js";

export const entryRepository = {
  listMineForMonth(
    spaceId: string,
    userId: string,
    monthStart: string,
    monthEnd: string,
    manager: EntityManager
  ) {
    return manager.find(Entry, {
      where: {
        spaceId,
        userId,
        occurredOn: Between(monthStart, monthEnd),
      },
      relations: { category: true },
      order: { occurredOn: "DESC", createdAt: "DESC" },
    });
  },

  listSharedForMonth(
    spaceId: string,
    monthStart: string,
    monthEnd: string,
    manager: EntityManager
  ) {
    return manager.find(Entry, {
      where: {
        spaceId,
        visibility: "shared",
        occurredOn: Between(monthStart, monthEnd),
      },
      relations: { category: true },
      order: { occurredOn: "DESC", createdAt: "DESC" },
    });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(Entry, {
      where: { id },
      relations: { category: true },
    });
  },

  create(manager: EntityManager, fields: Partial<Entry>) {
    return manager.save(manager.create(Entry, fields));
  },

  save(manager: EntityManager, entry: Entry) {
    return manager.save(entry);
  },

  remove(manager: EntityManager, entry: Entry) {
    return manager.remove(entry);
  },
};
