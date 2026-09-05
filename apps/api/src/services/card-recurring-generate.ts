import type { DataSource, EntityManager } from "typeorm";
import {
  monthsThrough,
  monthToOccurredOn,
  type EntryVisibility,
} from "@homewallet/shared";
import { monthBounds } from "../lib/entry-mappers.js";
import { entryCardLineRepository } from "../repositories/entry-card-line.repository.js";
import { entryCardRecurringSkipRepository } from "../repositories/entry-card-recurring-skip.repository.js";
import { entryRepository } from "../repositories/entry.repository.js";

async function preferCardStatementEntry(
  spaceId: string,
  userId: string,
  categoryId: string,
  month: string,
  manager: EntityManager
) {
  const { start, end } = monthBounds(month);
  const candidates = await entryRepository.findExpenseForCategoryMonth(
    spaceId,
    userId,
    categoryId,
    start,
    end,
    manager
  );
  if (candidates.length === 0) {
    return null;
  }
  const withLines = candidates.find(
    (candidate) => (candidate.cardLines?.length ?? 0) > 0
  );
  return withLines ?? candidates[0]!;
}

async function ensureCardStatementEntry(
  manager: EntityManager,
  fields: {
    spaceId: string;
    userId: string;
    categoryId: string;
    visibility: EntryVisibility;
    month: string;
    lineAmount: number;
  }
) {
  const existing = await preferCardStatementEntry(
    fields.spaceId,
    fields.userId,
    fields.categoryId,
    fields.month,
    manager
  );
  if (existing) {
    return existing;
  }
  return entryRepository.create(manager, {
    spaceId: fields.spaceId,
    userId: fields.userId,
    categoryId: fields.categoryId,
    type: "expense",
    amount: fields.lineAmount.toFixed(2),
    description: "",
    visibility: fields.visibility,
    occurredOn: monthToOccurredOn(fields.month),
    recurringRuleId: null,
    installmentPlanId: null,
    installmentNumber: null,
    reservePotId: null,
    transferGroupId: null,
    counterpartyUserId: null,
    cardInstallmentSeeded: true,
  });
}

async function appendRecurringLine(
  manager: EntityManager,
  entryId: string,
  fields: {
    categoryId: string;
    description: string;
    amount: number;
    recurringGroupId: string;
  }
) {
  const existingLines = await entryCardLineRepository.listForEntry(
    entryId,
    manager
  );
  return entryCardLineRepository.create(manager, {
    entryId,
    categoryId: fields.categoryId,
    description: fields.description,
    amount: fields.amount.toFixed(2),
    sortOrder: existingLines.length,
    installmentGroupId: null,
    installmentNumber: null,
    installmentCount: null,
    recurringGroupId: fields.recurringGroupId,
  });
}

async function afterLineOnStatement(
  manager: EntityManager,
  target: {
    id: string;
    amount: string;
    cardInstallmentSeeded: boolean;
  },
  lineAmount: number
) {
  if (target.cardInstallmentSeeded) {
    const lines = await entryCardLineRepository.listForEntry(
      target.id,
      manager
    );
    await entryRepository.updateAmount(
      manager,
      target.id,
      lines.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2)
    );
    return;
  }
  await entryRepository.updateAmount(
    manager,
    target.id,
    (Number(target.amount) + lineAmount).toFixed(2)
  );
}

type RecurringCardGroup = {
  recurringGroupId: string;
  lineCategoryId: string;
  description: string;
  amount: number;
  statementCategoryId: string;
  visibility: EntryVisibility;
  startMonth: string;
  monthsWithLine: Set<string>;
};

function buildRecurringGroups(
  lines: Awaited<
    ReturnType<typeof entryCardLineRepository.listRecurringForUser>
  >
): RecurringCardGroup[] {
  const byGroup = new Map<string, RecurringCardGroup>();

  for (const line of lines) {
    const groupId = line.recurringGroupId;
    if (!groupId || !line.entry?.categoryId) {
      continue;
    }
    const month = line.entry.occurredOn.slice(0, 7);
    const existing = byGroup.get(groupId);
    if (!existing) {
      byGroup.set(groupId, {
        recurringGroupId: groupId,
        lineCategoryId: line.categoryId,
        description: line.description,
        amount: Number(line.amount),
        statementCategoryId: line.entry.categoryId,
        visibility: line.entry.visibility,
        startMonth: month,
        monthsWithLine: new Set([month]),
      });
      continue;
    }
    existing.monthsWithLine.add(month);
    if (month < existing.startMonth) {
      existing.startMonth = month;
    }
  }

  return [...byGroup.values()];
}

/** Materialize open-ended card-line subscriptions onto statements through a month. */
export async function ensureCardRecurringThrough(
  dataSource: DataSource,
  spaceId: string,
  userId: string,
  throughMonth: string
) {
  const lines = await entryCardLineRepository.listRecurringForUser(
    spaceId,
    userId,
    dataSource.manager
  );
  if (lines.length === 0) {
    return;
  }

  const groups = buildRecurringGroups(lines);
  const skips = await entryCardRecurringSkipRepository.listForGroups(
    groups.map((group) => group.recurringGroupId),
    dataSource.manager
  );
  const skipKeys = new Set(
    skips.map((skip) => `${skip.recurringGroupId}:${skip.month}`)
  );

  await dataSource.transaction(async (manager) => {
    for (const group of groups) {
      if (throughMonth < group.startMonth) {
        continue;
      }
      for (const month of monthsThrough(group.startMonth, throughMonth)) {
        if (group.monthsWithLine.has(month)) {
          continue;
        }
        if (skipKeys.has(`${group.recurringGroupId}:${month}`)) {
          continue;
        }
        const target = await ensureCardStatementEntry(manager, {
          spaceId,
          userId,
          categoryId: group.statementCategoryId,
          visibility: group.visibility,
          month,
          lineAmount: group.amount,
        });
        await appendRecurringLine(manager, target.id, {
          categoryId: group.lineCategoryId,
          description: group.description,
          amount: group.amount,
          recurringGroupId: group.recurringGroupId,
        });
        await afterLineOnStatement(manager, target, group.amount);
        group.monthsWithLine.add(month);
      }
    }
  });
}
