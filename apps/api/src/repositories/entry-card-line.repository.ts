import type { EntityManager } from "typeorm";
import { EntryCardLine } from "../db/entities/entry-card-line.entity.js";

export const entryCardLineRepository = {
  replaceForEntry(
    manager: EntityManager,
    entryId: string,
    lines: {
      categoryId: string;
      description: string;
      amount: string;
      sortOrder: number;
      installmentGroupId?: string | null;
      installmentNumber?: number | null;
      installmentCount?: number | null;
    }[]
  ) {
    return (async () => {
      await manager.delete(EntryCardLine, { entryId });
      if (lines.length === 0) {
        return [];
      }
      return manager.save(
        lines.map((line) =>
          manager.create(EntryCardLine, {
            entryId,
            categoryId: line.categoryId,
            description: line.description,
            amount: line.amount,
            sortOrder: line.sortOrder,
            installmentGroupId: line.installmentGroupId ?? null,
            installmentNumber: line.installmentNumber ?? null,
            installmentCount: line.installmentCount ?? null,
          })
        )
      );
    })();
  },

  create(
    manager: EntityManager,
    fields: {
      entryId: string;
      categoryId: string;
      description: string;
      amount: string;
      sortOrder: number;
      installmentGroupId?: string | null;
      installmentNumber?: number | null;
      installmentCount?: number | null;
    }
  ) {
    return manager.save(manager.create(EntryCardLine, fields));
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(EntryCardLine, {
      where: { id },
      relations: { entry: true, category: true },
    });
  },

  listForEntry(entryId: string, manager: EntityManager) {
    return manager.find(EntryCardLine, {
      where: { entryId },
      relations: { category: true },
      order: { sortOrder: "ASC", id: "ASC" },
    });
  },

  countForEntry(entryId: string, manager: EntityManager) {
    return manager.count(EntryCardLine, { where: { entryId } });
  },

  findByInstallmentGroup(installmentGroupId: string, manager: EntityManager) {
    return manager.find(EntryCardLine, {
      where: { installmentGroupId },
      relations: { entry: true },
    });
  },

  remove(manager: EntityManager, line: EntryCardLine) {
    return manager.remove(line);
  },

  removeByIds(manager: EntityManager, ids: string[]) {
    if (ids.length === 0) {
      return Promise.resolve();
    }
    return manager.delete(EntryCardLine, ids);
  },
};
