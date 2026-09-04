import type { EntityManager } from "typeorm";
import { Category } from "../db/entities/category.entity.js";
import { SAVING_CATEGORY_NAME } from "@homewallet/shared";
import {
  CREDIT_CARD_CATEGORY_NAME,
  DEFAULT_CATEGORY_LAYERS,
  DEFAULT_CATEGORY_LINE_DETAIL,
  DEFAULT_CATEGORY_NAMES,
} from "../lib/default-categories.js";

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

  save(manager: EntityManager, category: Category) {
    return manager.save(category);
  },

  async seedDefaults(spaceId: string, manager: EntityManager) {
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await manager.save(
        manager.create(Category, {
          spaceId,
          name,
          isDefault: true,
          budgetLayer: DEFAULT_CATEGORY_LAYERS[name],
          lineDetailEnabled: DEFAULT_CATEGORY_LINE_DETAIL[name],
        })
      );
    }
  },

  async ensureSavingCategory(spaceId: string, manager: EntityManager) {
    const existing = await this.findByName(
      spaceId,
      SAVING_CATEGORY_NAME,
      manager
    );
    if (existing) {
      return existing;
    }
    return this.create(manager, {
      spaceId,
      name: SAVING_CATEGORY_NAME,
      isDefault: true,
      budgetLayer: "future",
      lineDetailEnabled: false,
    });
  },

  async ensureCreditCardCategory(spaceId: string, manager: EntityManager) {
    const existing = await this.findByName(
      spaceId,
      CREDIT_CARD_CATEGORY_NAME,
      manager
    );
    if (existing) {
      if (!existing.lineDetailEnabled) {
        existing.lineDetailEnabled = true;
        return this.save(manager, existing);
      }
      return existing;
    }
    return this.create(manager, {
      spaceId,
      name: CREDIT_CARD_CATEGORY_NAME,
      isDefault: true,
      budgetLayer: "personal",
      lineDetailEnabled: true,
    });
  },
};
