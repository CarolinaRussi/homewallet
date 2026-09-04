import type { EntityManager } from "typeorm";
import { In } from "typeorm";
import { RecurrenceSkip } from "../db/entities/recurrence-skip.entity.js";

export const recurrenceSkipRepository = {
  listForRules(
    ruleIds: string[],
    manager: EntityManager
  ): Promise<RecurrenceSkip[]> {
    if (ruleIds.length === 0) {
      return Promise.resolve([]);
    }
    return manager.find(RecurrenceSkip, {
      where: { recurringRuleId: In(ruleIds) },
    });
  },

  find(ruleId: string, month: string, manager: EntityManager) {
    return manager.findOne(RecurrenceSkip, {
      where: { recurringRuleId: ruleId, month },
    });
  },

  create(manager: EntityManager, fields: Partial<RecurrenceSkip>) {
    return manager.save(manager.create(RecurrenceSkip, fields));
  },
};
