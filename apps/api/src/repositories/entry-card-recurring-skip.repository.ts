import type { EntityManager } from "typeorm";
import { In } from "typeorm";
import { EntryCardRecurringSkip } from "../db/entities/entry-card-recurring-skip.entity.js";

export const entryCardRecurringSkipRepository = {
  listForGroups(groupIds: string[], manager: EntityManager) {
    if (groupIds.length === 0) {
      return Promise.resolve([] as EntryCardRecurringSkip[]);
    }
    return manager.find(EntryCardRecurringSkip, {
      where: { recurringGroupId: In(groupIds) },
    });
  },

  create(
    manager: EntityManager,
    fields: { recurringGroupId: string; month: string }
  ) {
    return manager.save(manager.create(EntryCardRecurringSkip, fields));
  },

  removeForGroup(manager: EntityManager, recurringGroupId: string) {
    return manager.delete(EntryCardRecurringSkip, { recurringGroupId });
  },
};
