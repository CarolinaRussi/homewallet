import type { EntityManager } from "typeorm";
import { Between, LessThanOrEqual, MoreThanOrEqual } from "typeorm";
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
      relations: { category: true, installmentPlan: true },
      order: { occurredOn: "DESC", createdAt: "DESC" },
    });
  },

  listMineThrough(
    spaceId: string,
    userId: string,
    throughDate: string,
    manager: EntityManager
  ) {
    return manager.find(Entry, {
      where: {
        spaceId,
        userId,
        occurredOn: LessThanOrEqual(throughDate),
      },
      order: { occurredOn: "ASC", createdAt: "ASC" },
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
      relations: { category: true, installmentPlan: true },
      order: { occurredOn: "DESC", createdAt: "DESC" },
    });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(Entry, {
      where: { id },
      relations: { category: true, installmentPlan: true },
    });
  },

  findRecurringForMonth(
    recurringRuleId: string,
    occurredOn: string,
    manager: EntityManager
  ) {
    return manager.findOne(Entry, {
      where: { recurringRuleId, occurredOn },
    });
  },

  countForInstallmentPlan(installmentPlanId: string, manager: EntityManager) {
    return manager.count(Entry, { where: { installmentPlanId } });
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

  removeByInstallmentPlan(installmentPlanId: string, manager: EntityManager) {
    return manager.delete(Entry, { installmentPlanId });
  },

  removeInstallmentFromNumber(
    installmentPlanId: string,
    fromNumber: number,
    manager: EntityManager
  ) {
    return manager.delete(Entry, {
      installmentPlanId,
      installmentNumber: MoreThanOrEqual(fromNumber),
    });
  },
};
