import type { EntityManager } from "typeorm";
import { In } from "typeorm";
import { Entry } from "../db/entities/entry.entity.js";
import { EntryCardLine } from "../db/entities/entry-card-line.entity.js";
import { InstallmentPlan } from "../db/entities/installment-plan.entity.js";
import { LeftoverSeed } from "../db/entities/leftover-seed.entity.js";
import { RecurrenceSkip } from "../db/entities/recurrence-skip.entity.js";
import { RecurringRule } from "../db/entities/recurring-rule.entity.js";
import { ReserveMovement } from "../db/entities/reserve-movement.entity.js";
import { ReservePot } from "../db/entities/reserve-pot.entity.js";
import { SpaceHistoryMove } from "../db/entities/space-history-move.entity.js";

function toMonth(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const text =
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return text.slice(0, 7);
}

export const spaceHistoryRepository = {
  findImportMove(
    userId: string,
    sourceSpaceId: string,
    targetSpaceId: string,
    manager: EntityManager
  ) {
    return manager.findOne(SpaceHistoryMove, {
      where: {
        userId,
        sourceSpaceId,
        targetSpaceId,
        direction: "import",
      },
    });
  },

  listImportMovesForTarget(
    userId: string,
    targetSpaceId: string,
    manager: EntityManager
  ) {
    return manager.find(SpaceHistoryMove, {
      where: { userId, targetSpaceId, direction: "import" },
    });
  },

  async entryStats(spaceId: string, userId: string, manager: EntityManager) {
    const row = await manager
      .createQueryBuilder(Entry, "entryRow")
      .select("COUNT(*)", "entryCount")
      .addSelect("MIN(entryRow.occurredOn)", "monthFrom")
      .addSelect("MAX(entryRow.occurredOn)", "monthTo")
      .where("entryRow.spaceId = :spaceId AND entryRow.userId = :userId", {
        spaceId,
        userId,
      })
      .getRawOne<{
        entryCount: string;
        monthFrom: unknown;
        monthTo: unknown;
      }>();
    return {
      entryCount: Number(row?.entryCount ?? 0),
      monthFrom: toMonth(row?.monthFrom),
      monthTo: toMonth(row?.monthTo),
    };
  },

  async usedCategoryIds(
    spaceId: string,
    userId: string,
    manager: EntityManager
  ) {
    const fromEntries = await manager
      .createQueryBuilder(Entry, "entryRow")
      .select("DISTINCT entryRow.categoryId", "categoryId")
      .where("entryRow.spaceId = :spaceId AND entryRow.userId = :userId", {
        spaceId,
        userId,
      })
      .andWhere("entryRow.categoryId IS NOT NULL")
      .getRawMany<{ categoryId: string }>();
    const fromLines = await manager
      .createQueryBuilder(EntryCardLine, "lineRow")
      .innerJoin(Entry, "entryRow", "entryRow.id = lineRow.entryId")
      .select("DISTINCT lineRow.categoryId", "categoryId")
      .where("entryRow.spaceId = :spaceId AND entryRow.userId = :userId", {
        spaceId,
        userId,
      })
      .getRawMany<{ categoryId: string }>();
    return new Set(
      [...fromEntries, ...fromLines]
        .map((row) => row.categoryId)
        .filter(Boolean)
    );
  },

  async transferCounterparties(
    spaceId: string,
    userId: string,
    manager: EntityManager
  ) {
    const rows = await manager
      .createQueryBuilder(Entry, "entryRow")
      .select("DISTINCT entryRow.counterpartyUserId", "counterpartyUserId")
      .where("entryRow.spaceId = :spaceId AND entryRow.userId = :userId", {
        spaceId,
        userId,
      })
      .andWhere("entryRow.type IN (:...types)", {
        types: ["transfer_out", "transfer_in"],
      })
      .andWhere("entryRow.counterpartyUserId IS NOT NULL")
      .getRawMany<{ counterpartyUserId: string }>();
    return rows.map((row) => row.counterpartyUserId);
  },

  async reserveBalance(
    spaceId: string,
    userId: string,
    manager: EntityManager
  ) {
    const movements = await manager.find(ReserveMovement, {
      where: { spaceId, userId },
    });
    let balance = 0;
    for (const movement of movements) {
      const amount = Number(movement.amount);
      if (movement.type === "withdraw") {
        balance -= amount;
      } else {
        balance += amount;
      }
    }
    return balance;
  },

  listActorEntries(spaceId: string, userId: string, manager: EntityManager) {
    return manager.find(Entry, {
      where: { spaceId, userId },
      select: {
        id: true,
        type: true,
        visibility: true,
        categoryId: true,
        occurredOn: true,
        counterpartyUserId: true,
        reservePotId: true,
      },
    });
  },

  async usedCategoryIdsForEntries(entryIds: string[], manager: EntityManager) {
    const ids = new Set<string>();
    if (entryIds.length === 0) {
      return ids;
    }
    const fromLines = await manager
      .createQueryBuilder(EntryCardLine, "lineRow")
      .select("DISTINCT lineRow.categoryId", "categoryId")
      .where("lineRow.entryId IN (:...entryIds)", { entryIds })
      .getRawMany<{ categoryId: string }>();
    for (const row of fromLines) {
      if (row.categoryId) {
        ids.add(row.categoryId);
      }
    }
    return ids;
  },

  lockActorEntries(spaceId: string, userId: string, manager: EntityManager) {
    return manager
      .createQueryBuilder(Entry, "entryRow")
      .setLock("pessimistic_write")
      .where("entryRow.spaceId = :spaceId AND entryRow.userId = :userId", {
        spaceId,
        userId,
      })
      .getMany();
  },

  createMove(manager: EntityManager, fields: Partial<SpaceHistoryMove>) {
    return manager.save(manager.create(SpaceHistoryMove, fields));
  },

  async applyCategoryRemap(
    sourceSpaceId: string,
    userId: string,
    categoryRemap: Record<string, string>,
    manager: EntityManager
  ) {
    for (const [sourceCategoryId, targetCategoryId] of Object.entries(
      categoryRemap
    )) {
      await manager.update(
        Entry,
        { spaceId: sourceSpaceId, userId, categoryId: sourceCategoryId },
        { categoryId: targetCategoryId }
      );
      await manager.update(
        RecurringRule,
        { spaceId: sourceSpaceId, userId, categoryId: sourceCategoryId },
        { categoryId: targetCategoryId }
      );
      await manager.update(
        InstallmentPlan,
        { spaceId: sourceSpaceId, userId, categoryId: sourceCategoryId },
        { categoryId: targetCategoryId }
      );
      const lineIds = await manager
        .createQueryBuilder(EntryCardLine, "lineRow")
        .innerJoin(Entry, "entryRow", "entryRow.id = lineRow.entryId")
        .select("lineRow.id", "id")
        .where(
          "entryRow.spaceId = :sourceSpaceId AND entryRow.userId = :userId",
          { sourceSpaceId, userId }
        )
        .andWhere("lineRow.categoryId = :sourceCategoryId", {
          sourceCategoryId,
        })
        .getRawMany<{ id: string }>();
      if (lineIds.length > 0) {
        await manager.update(
          EntryCardLine,
          { id: In(lineIds.map((row) => row.id)) },
          { categoryId: targetCategoryId }
        );
      }
    }
  },

  async applyPotRemap(
    potRemap: Record<string, string>,
    manager: EntityManager
  ) {
    for (const [sourcePotId, targetPotId] of Object.entries(potRemap)) {
      if (sourcePotId === targetPotId) {
        continue;
      }
      await manager.update(
        Entry,
        { reservePotId: sourcePotId },
        { reservePotId: targetPotId }
      );
      await manager.update(
        ReserveMovement,
        { reservePotId: sourcePotId },
        { reservePotId: targetPotId }
      );
      const sourcePot = await manager.findOne(ReservePot, {
        where: { id: sourcePotId },
      });
      if (sourcePot) {
        await manager.remove(sourcePot);
      }
    }
  },

  async moveActorRowsToSpace(
    sourceSpaceId: string,
    targetSpaceId: string,
    userId: string,
    manager: EntityManager
  ) {
    await manager.update(
      Entry,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      RecurringRule,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      InstallmentPlan,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      RecurrenceSkip,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      ReserveMovement,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      LeftoverSeed,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      ReservePot,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
  },

  async applyCategoryRemapToEntries(
    entryIds: string[],
    sourceSpaceId: string,
    userId: string,
    categoryRemap: Record<string, string>,
    manager: EntityManager
  ) {
    if (entryIds.length === 0) {
      return;
    }
    for (const [sourceCategoryId, targetCategoryId] of Object.entries(
      categoryRemap
    )) {
      await manager
        .createQueryBuilder()
        .update(Entry)
        .set({ categoryId: targetCategoryId })
        .where("id IN (:...entryIds)", { entryIds })
        .andWhere("category_id = :sourceCategoryId", { sourceCategoryId })
        .execute();
      const lineIds = await manager
        .createQueryBuilder(EntryCardLine, "lineRow")
        .select("lineRow.id", "id")
        .where("lineRow.entryId IN (:...entryIds)", { entryIds })
        .andWhere("lineRow.categoryId = :sourceCategoryId", {
          sourceCategoryId,
        })
        .getRawMany<{ id: string }>();
      if (lineIds.length > 0) {
        await manager.update(
          EntryCardLine,
          { id: In(lineIds.map((row) => row.id)) },
          { categoryId: targetCategoryId }
        );
      }
      await manager.update(
        RecurringRule,
        { spaceId: sourceSpaceId, userId, categoryId: sourceCategoryId },
        { categoryId: targetCategoryId }
      );
      await manager.update(
        InstallmentPlan,
        { spaceId: sourceSpaceId, userId, categoryId: sourceCategoryId },
        { categoryId: targetCategoryId }
      );
    }
  },

  async detachStayEntries(stayIds: string[], manager: EntityManager) {
    if (stayIds.length === 0) {
      return;
    }
    await manager
      .createQueryBuilder()
      .update(Entry)
      .set({
        recurringRuleId: null,
        installmentPlanId: null,
        reservePotId: null,
      })
      .where("id IN (:...stayIds)", { stayIds })
      .execute();
  },

  async moveEntriesByIds(
    entryIds: string[],
    targetSpaceId: string,
    manager: EntityManager
  ) {
    if (entryIds.length === 0) {
      return;
    }
    await manager
      .createQueryBuilder()
      .update(Entry)
      .set({ spaceId: targetSpaceId })
      .where("id IN (:...entryIds)", { entryIds })
      .execute();
  },

  async moveSupportRowsToSpace(
    sourceSpaceId: string,
    targetSpaceId: string,
    userId: string,
    manager: EntityManager
  ) {
    await manager.update(
      RecurringRule,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      InstallmentPlan,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      RecurrenceSkip,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      ReserveMovement,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      LeftoverSeed,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
    await manager.update(
      ReservePot,
      { spaceId: sourceSpaceId, userId },
      { spaceId: targetSpaceId }
    );
  },
};
