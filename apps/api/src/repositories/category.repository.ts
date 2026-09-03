import type { EntityManager } from "typeorm";
import { Category } from "../db/entities/category.entity.js";
import { DEFAULT_CATEGORY_NAMES } from "../lib/default-categories.js";

export const categoryRepository = {
  listForSpace(spaceId: string, manager: EntityManager) {
    return manager.find(Category, {
      where: { spaceId },
      order: { name: "ASC" },
    });
  },

  findById(id: string, spaceId: string, manager: EntityManager) {
    return manager.findOne(Category, { where: { id, spaceId } });
  },

  findByName(spaceId: string, name: string, manager: EntityManager) {
    return manager.findOne(Category, { where: { spaceId, name } });
  },

  create(manager: EntityManager, fields: Partial<Category>) {
    return manager.save(manager.create(Category, fields));
  },

  async seedDefaults(spaceId: string, manager: EntityManager) {
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await manager.save(
        manager.create(Category, {
          spaceId,
          name,
          isDefault: true,
        })
      );
    }
  },
};
