import type { EntityManager } from "typeorm";
import { RecurringRule } from "../db/entities/recurring-rule.entity.js";

export const recurringRuleRepository = {
  listForUser(spaceId: string, userId: string, manager: EntityManager) {
    return manager.find(RecurringRule, {
      where: { spaceId, userId },
      relations: { category: true },
      order: { startMonth: "DESC", createdAt: "DESC" },
    });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(RecurringRule, {
      where: { id },
      relations: { category: true },
    });
  },

  create(manager: EntityManager, fields: Partial<RecurringRule>) {
    return manager.save(manager.create(RecurringRule, fields));
  },

  remove(manager: EntityManager, rule: RecurringRule) {
    return manager.remove(rule);
  },
};
