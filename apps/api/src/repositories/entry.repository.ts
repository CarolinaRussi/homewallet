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
      relations: {
        category: true,
        installmentPlan: true,
        reservePot: true,
        user: true,
        counterparty: true,
        cardLines: { category: true },
      },
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
      relations: {
        category: true,
        installmentPlan: true,
        reservePot: true,
        user: true,
        counterparty: true,
        cardLines: { category: true },
      },
      order: { occurredOn: "DESC", createdAt: "DESC" },
    });
  },

  listAllForMonth(
    spaceId: string,
    monthStart: string,
    monthEnd: string,
    manager: EntityManager
  ) {
    return manager.find(Entry, {
      where: {
        spaceId,
        occurredOn: Between(monthStart, monthEnd),
      },
      relations: {
        category: true,
        installmentPlan: true,
        reservePot: true,
        user: true,
        counterparty: true,
        cardLines: { category: true },
      },
      order: { occurredOn: "DESC", createdAt: "DESC" },
    });
  },

  /** Lightweight rows for Overview series (no card/category graphs). */
  listForOverviewRange(
    spaceId: string,
    rangeStart: string,
    rangeEnd: string,
    manager: EntityManager,
    filters?: { userId?: string; visibility?: "shared" }
  ) {
    return manager.find(Entry, {
      where: {
        spaceId,
        occurredOn: Between(rangeStart, rangeEnd),
        ...(filters?.userId ? { userId: filters.userId } : {}),
        ...(filters?.visibility ? { visibility: filters.visibility } : {}),
      },
      select: {
        id: true,
        type: true,
        amount: true,
        occurredOn: true,
        userId: true,
        visibility: true,
      },
      order: { occurredOn: "ASC" },
    });
  },

  listAllForUser(userId: string, manager: EntityManager) {
    return manager.find(Entry, {
      where: { userId },
      relations: {
        category: true,
        space: true,
        reservePot: true,
      },
      order: { occurredOn: "DESC", createdAt: "DESC" },
    });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(Entry, {
      where: { id },
      relations: {
        category: true,
        installmentPlan: true,
        reservePot: true,
        user: true,
        counterparty: true,
        cardLines: { category: true },
      },
    });
  },

  /** No relations — use when mutating FKs so loaded relations cannot overwrite columns on save. */
  findByIdPlain(id: string, manager: EntityManager) {
    return manager.findOne(Entry, { where: { id } });
  },

  findByTransferGroup(transferGroupId: string, manager: EntityManager) {
    return manager.find(Entry, {
      where: { transferGroupId },
      relations: {
        category: true,
        user: true,
        counterparty: true,
      },
    });
  },

  findExpenseForCategoryMonth(
    spaceId: string,
    userId: string,
    categoryId: string,
    monthStart: string,
    monthEnd: string,
    manager: EntityManager
  ) {
    return manager.find(Entry, {
      where: {
        spaceId,
        userId,
        categoryId,
        type: "expense",
        occurredOn: Between(monthStart, monthEnd),
      },
      relations: {
        category: true,
        cardLines: { category: true },
      },
      order: { createdAt: "ASC" },
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

  listInstallmentFromNumber(
    installmentPlanId: string,
    fromNumber: number,
    manager: EntityManager
  ) {
    return manager.find(Entry, {
      where: {
        installmentPlanId,
        installmentNumber: MoreThanOrEqual(fromNumber),
      },
      order: { installmentNumber: "ASC" },
    });
  },

  create(manager: EntityManager, fields: Partial<Entry>) {
    return manager.save(manager.create(Entry, fields));
  },

  save(manager: EntityManager, entry: Entry) {
    return manager.save(entry);
  },

  /** Scalar update — avoids TypeORM nulling `entry_card_lines.entry_id` when `cardLines` is loaded. */
  updateAmount(manager: EntityManager, entryId: string, amount: string) {
    return manager.update(Entry, { id: entryId }, { amount });
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
