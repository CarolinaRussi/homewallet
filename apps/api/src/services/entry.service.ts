import { randomUUID } from "node:crypto";
import type { DataSource, EntityManager } from "typeorm";
import type {
  AddEntryCardLineBody,
  CreateEntryBody,
  EntryCardLineInput,
  EntrySummary,
  EntryVisibility,
  UpdateEntryBody,
  UpdateEntryCardLineBody,
} from "@homewallet/shared";
import {
  cardOthersAmount,
  monthToOccurredOn,
  remainingInstallmentSchedule,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { monthBounds, toEntrySummary } from "../lib/entry-mappers.js";
import { EntryCardLine } from "../db/entities/entry-card-line.entity.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { entryCardLineRepository } from "../repositories/entry-card-line.repository.js";
import { entryCardRecurringSkipRepository } from "../repositories/entry-card-recurring-skip.repository.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { installmentPlanRepository } from "../repositories/installment-plan.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { recurrenceSkipRepository } from "../repositories/recurrence-skip.repository.js";
import { recurringRuleRepository } from "../repositories/recurring-rule.repository.js";
import type { MonthSnapshotService } from "./month-snapshot.service.js";
import { monthKeyFromDate } from "./month-snapshot.build.js";
import type { RecurringService } from "./recurring.service.js";
import type { ReservePotService } from "./reserve-pot.service.js";

export type InstallmentDeleteScope = "one" | "forward";

function cardLineMonth(line: EntryCardLine) {
  return line.entry?.occurredOn?.slice(0, 7) ?? "";
}

/**
 * This occurrence + later months/parcels only.
 * Same-month (or same parcel number) duplicates are NOT included — only the anchor id.
 */
function cardLinesForwardFrom(
  anchor: EntryCardLine,
  groupLines: EntryCardLine[]
): EntryCardLine[] {
  if (anchor.installmentGroupId && anchor.installmentNumber != null) {
    return groupLines.filter(
      (row) =>
        row.id === anchor.id ||
        (row.installmentNumber != null &&
          row.installmentNumber > anchor.installmentNumber!)
    );
  }
  if (anchor.recurringGroupId) {
    const startMonth = cardLineMonth(anchor);
    return groupLines.filter(
      (row) => row.id === anchor.id || cardLineMonth(row) > startMonth
    );
  }
  return [anchor];
}

export function createEntryService(
  dataSource: DataSource,
  recurringService: RecurringService,
  reservePotService: ReservePotService,
  monthSnapshotService: MonthSnapshotService
) {
  async function requireMember(userId: string, spaceId: string) {
    const membership = await membershipRepository.findMembership(
      userId,
      spaceId,
      dataSource.manager
    );
    if (!membership) {
      throw new HttpError(404, "Space not found");
    }
    return membership;
  }

  async function requireOwnCategory(spaceId: string, categoryId: string) {
    const category = await categoryRepository.findById(
      categoryId,
      spaceId,
      dataSource.manager
    );
    if (!category) {
      throw new HttpError(400, "Category not found in this space");
    }
    return category;
  }

  async function touchSnapshots(
    userId: string,
    spaceId: string,
    ...months: string[]
  ) {
    await monthSnapshotService.touch(userId, spaceId, ...months);
  }

  async function resolveSavingCategory(spaceId: string) {
    return categoryRepository.ensureSavingCategory(spaceId, dataSource.manager);
  }

  async function assertCardLineCategories(
    spaceId: string,
    lines: EntryCardLineInput[]
  ) {
    for (const line of lines) {
      await requireOwnCategory(spaceId, line.categoryId);
    }
  }

  function assertCardLinesFitAmount(
    amount: number,
    lines: EntryCardLineInput[]
  ) {
    if (lines.length === 0) {
      return;
    }
    const others = cardOthersAmount(
      amount,
      lines.map((line) => line.amount)
    );
    if (others < 0) {
      throw new HttpError(400, "cardLines sum cannot exceed amount");
    }
  }

  async function replaceCardLines(
    manager: EntityManager,
    entryId: string,
    spaceId: string,
    amount: number,
    parentCategoryId: string | null,
    lines: EntryCardLineInput[] | undefined
  ) {
    if (lines === undefined) {
      return;
    }
    if (lines.length > 0) {
      if (!parentCategoryId) {
        throw new HttpError(400, "Category required for statement detail");
      }
      const parentCategory = await requireOwnCategory(
        spaceId,
        parentCategoryId
      );
      if (!parentCategory.lineDetailEnabled) {
        throw new HttpError(
          400,
          "This category does not allow statement detail"
        );
      }
    }
    await assertCardLineCategories(spaceId, lines);
    assertCardLinesFitAmount(amount, lines);
    if (lines.length === 0) {
      const existing = await entryCardLineRepository.listForEntry(
        entryId,
        manager
      );
      const groupIds = [
        ...new Set(
          existing
            .map((line) => line.installmentGroupId)
            .filter((groupId): groupId is string => Boolean(groupId))
        ),
      ];
      for (const groupId of groupIds) {
        const groupLines = await entryCardLineRepository.findByInstallmentGroup(
          groupId,
          manager
        );
        const affectedEntryIds = [
          ...new Set(groupLines.map((row) => row.entryId)),
        ];
        await entryCardLineRepository.removeByIds(
          manager,
          groupLines.map((row) => row.id)
        );
        for (const affectedId of affectedEntryIds) {
          if (affectedId === entryId) {
            continue;
          }
          const affected = await entryRepository.findById(affectedId, manager);
          if (!affected) {
            continue;
          }
          const remaining = await entryCardLineRepository.listForEntry(
            affectedId,
            manager
          );
          if (remaining.length === 0 && affected.cardInstallmentSeeded) {
            await entryRepository.remove(manager, affected);
            continue;
          }
          if (affected.cardInstallmentSeeded && remaining.length > 0) {
            await entryRepository.updateAmount(
              manager,
              affectedId,
              remaining
                .reduce((sum, row) => sum + Number(row.amount), 0)
                .toFixed(2)
            );
          }
        }
      }
    }
    await entryCardLineRepository.replaceForEntry(
      manager,
      entryId,
      lines.map((line, index) => ({
        categoryId: line.categoryId,
        description: line.description,
        amount: line.amount.toFixed(2),
        sortOrder: index,
      }))
    );
  }

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

  async function appendCardLine(
    manager: EntityManager,
    entryId: string,
    fields: {
      categoryId: string;
      description: string;
      amount: number;
      installmentGroupId: string | null;
      installmentNumber: number | null;
      installmentCount: number | null;
      recurringGroupId?: string | null;
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
      installmentGroupId: fields.installmentGroupId,
      installmentNumber: fields.installmentNumber,
      installmentCount: fields.installmentCount,
      recurringGroupId: fields.recurringGroupId ?? null,
    });
  }

  /** After line edits: seeded syncs to sum; manual bumps if lines exceed total. */
  async function reconcileStatementAmount(
    manager: EntityManager,
    entryId: string
  ) {
    const affected = await entryRepository.findById(entryId, manager);
    if (!affected) {
      return;
    }
    const remaining = await entryCardLineRepository.listForEntry(
      entryId,
      manager
    );
    if (remaining.length === 0 && affected.cardInstallmentSeeded) {
      await entryRepository.remove(manager, affected);
      return;
    }
    const linesSum = remaining.reduce(
      (sum, row) => sum + Number(row.amount),
      0
    );
    if (affected.cardInstallmentSeeded) {
      await entryRepository.updateAmount(manager, entryId, linesSum.toFixed(2));
      return;
    }
    if (linesSum - Number(affected.amount) > 1e-9) {
      await entryRepository.updateAmount(manager, entryId, linesSum.toFixed(2));
    }
  }

  /** Fresh load — TypeORM identity map keeps stale `cardLines` after append/remove. */
  async function loadEntrySummary(
    entryId: string
  ): Promise<EntrySummary | null> {
    const lines = await entryCardLineRepository.listForEntry(
      entryId,
      dataSource.manager
    );
    const loaded = await entryRepository.findById(entryId, dataSource.manager);
    if (!loaded) {
      return null;
    }
    loaded.cardLines = lines;
    return toEntrySummary(loaded);
  }

  async function queryMineForMonth(
    userId: string,
    spaceId: string,
    month: string
  ): Promise<EntrySummary[]> {
    const { start, end } = monthBounds(month);
    const entries = await entryRepository.listMineForMonth(
      spaceId,
      userId,
      start,
      end,
      dataSource.manager
    );
    return entries.map(toEntrySummary);
  }

  return {
    async listMine(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<EntrySummary[]> {
      await requireMember(userId, spaceId);
      await recurringService.ensureThrough(userId, spaceId, month);
      return queryMineForMonth(userId, spaceId, month);
    },

    async listMinePrepared(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<EntrySummary[]> {
      await requireMember(userId, spaceId);
      return queryMineForMonth(userId, spaceId, month);
    },

    async listShared(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<EntrySummary[]> {
      const membership = await requireMember(userId, spaceId);
      const { start, end } = monthBounds(month);
      const entries =
        membership.space.privacyMode === "transparent"
          ? await entryRepository.listAllForMonth(
              spaceId,
              start,
              end,
              dataSource.manager
            )
          : await entryRepository.listSharedForMonth(
              spaceId,
              start,
              end,
              dataSource.manager
            );
      return entries.map(toEntrySummary);
    },

    async create(
      userId: string,
      spaceId: string,
      input: CreateEntryBody
    ): Promise<EntrySummary> {
      await requireMember(userId, spaceId);

      if (input.type === "transfer") {
        const peerUserId = input.peerUserId!;
        if (peerUserId === userId) {
          throw new HttpError(400, "Cannot transfer to yourself");
        }
        await requireMember(peerUserId, spaceId);

        let categoryId: string | null = null;
        if (input.categoryId) {
          await requireOwnCategory(spaceId, input.categoryId);
          categoryId = input.categoryId;
        }

        const transferGroupId = randomUUID();
        const amount = input.amount.toFixed(2);

        const outEntry = await dataSource.transaction(async (manager) => {
          const outgoing = await entryRepository.create(manager, {
            spaceId,
            userId,
            categoryId,
            type: "transfer_out",
            amount,
            description: input.description,
            visibility: "personal",
            occurredOn: input.occurredOn,
            recurringRuleId: null,
            installmentPlanId: null,
            installmentNumber: null,
            reservePotId: null,
            transferGroupId,
            counterpartyUserId: peerUserId,
          });
          await entryRepository.create(manager, {
            spaceId,
            userId: peerUserId,
            categoryId,
            type: "transfer_in",
            amount,
            description: input.description,
            visibility: "personal",
            occurredOn: input.occurredOn,
            recurringRuleId: null,
            installmentPlanId: null,
            installmentNumber: null,
            reservePotId: null,
            transferGroupId,
            counterpartyUserId: userId,
          });
          return outgoing;
        });

        await touchSnapshots(
          userId,
          spaceId,
          monthKeyFromDate(input.occurredOn)
        );
        await touchSnapshots(
          peerUserId,
          spaceId,
          monthKeyFromDate(input.occurredOn)
        );

        const loaded = await entryRepository.findById(
          outEntry.id,
          dataSource.manager
        );
        if (!loaded) {
          throw new HttpError(500, "Failed to load entry");
        }
        return toEntrySummary(loaded);
      }

      if (input.type === "saving") {
        await reservePotService.requireOwnPot(
          userId,
          spaceId,
          input.reservePotId!
        );
        const category = await resolveSavingCategory(spaceId);
        const entry = await entryRepository.create(dataSource.manager, {
          spaceId,
          userId,
          categoryId: category.id,
          type: "saving",
          amount: input.amount.toFixed(2),
          description: input.description,
          visibility: "personal",
          occurredOn: input.occurredOn,
          recurringRuleId: null,
          installmentPlanId: null,
          installmentNumber: null,
          reservePotId: input.reservePotId!,
          transferGroupId: null,
          counterpartyUserId: null,
        });
        await touchSnapshots(
          userId,
          spaceId,
          monthKeyFromDate(input.occurredOn)
        );
        const loaded = await entryRepository.findById(
          entry.id,
          dataSource.manager
        );
        if (!loaded) {
          throw new HttpError(500, "Failed to load entry");
        }
        return toEntrySummary(loaded);
      }

      await requireOwnCategory(spaceId, input.categoryId!);
      const ledgerType = input.type as "income" | "expense";
      const entry = await dataSource.transaction(async (manager) => {
        const created = await entryRepository.create(manager, {
          spaceId,
          userId,
          categoryId: input.categoryId!,
          type: ledgerType,
          amount: input.amount.toFixed(2),
          description: input.description,
          visibility: input.visibility,
          occurredOn: input.occurredOn,
          recurringRuleId: null,
          installmentPlanId: null,
          installmentNumber: null,
          reservePotId: null,
          transferGroupId: null,
          counterpartyUserId: null,
        });
        if (ledgerType === "expense") {
          await replaceCardLines(
            manager,
            created.id,
            spaceId,
            input.amount,
            input.categoryId!,
            input.cardLines ?? []
          );
        }
        return created;
      });
      await touchSnapshots(userId, spaceId, monthKeyFromDate(input.occurredOn));
      const loaded = await entryRepository.findById(
        entry.id,
        dataSource.manager
      );
      if (!loaded) {
        throw new HttpError(500, "Failed to load entry");
      }
      return toEntrySummary(loaded);
    },

    async update(
      userId: string,
      entryId: string,
      input: UpdateEntryBody
    ): Promise<EntrySummary> {
      const entry = await entryRepository.findByIdPlain(
        entryId,
        dataSource.manager
      );
      if (!entry) {
        throw new HttpError(404, "Entry not found");
      }
      if (entry.userId !== userId) {
        throw new HttpError(403, "You can only edit your own entries");
      }
      await requireMember(userId, entry.spaceId);
      const monthBefore = monthKeyFromDate(entry.occurredOn);

      const installmentScope = input.installmentScope ?? "one";
      const canForwardInstallment =
        Boolean(entry.installmentPlanId) && entry.installmentNumber != null;
      const canForwardRecurring = Boolean(entry.recurringRuleId);
      if (
        installmentScope === "forward" &&
        !canForwardInstallment &&
        !canForwardRecurring
      ) {
        throw new HttpError(
          400,
          "installmentScope forward is only for installment or recurring entries"
        );
      }
      if (installmentScope === "forward" && input.cardLines !== undefined) {
        throw new HttpError(
          400,
          "cardLines cannot use installmentScope forward"
        );
      }

      if (entry.type === "transfer_out" || entry.type === "transfer_in") {
        if (input.type !== undefined) {
          throw new HttpError(400, "Cannot change transfer type");
        }
        if (input.visibility !== undefined) {
          throw new HttpError(400, "Transfers stay personal");
        }
        if (input.reservePotId !== undefined) {
          throw new HttpError(400, "Transfers cannot use a reserve pot");
        }
        if (input.cardLines !== undefined) {
          throw new HttpError(400, "Transfers cannot have card lines");
        }
        if (installmentScope === "forward") {
          throw new HttpError(400, "Transfers have no installment scope");
        }

        if (input.categoryId !== undefined) {
          if (input.categoryId) {
            await requireOwnCategory(entry.spaceId, input.categoryId);
            entry.categoryId = input.categoryId;
          } else {
            entry.categoryId = null;
          }
        }
        if (input.amount !== undefined) entry.amount = input.amount.toFixed(2);
        if (input.description !== undefined)
          entry.description = input.description;
        if (input.occurredOn) entry.occurredOn = input.occurredOn;

        await dataSource.transaction(async (manager) => {
          await entryRepository.save(manager, entry);
          if (!entry.transferGroupId) {
            return;
          }
          const pair = await entryRepository.findByTransferGroup(
            entry.transferGroupId,
            manager
          );
          const other = pair.find((row) => row.id !== entry.id);
          if (!other) {
            return;
          }
          if (input.amount !== undefined) other.amount = entry.amount;
          if (input.occurredOn) other.occurredOn = entry.occurredOn;
          if (input.description !== undefined)
            other.description = entry.description;
          if (input.categoryId !== undefined)
            other.categoryId = entry.categoryId;
          Reflect.deleteProperty(other, "category");
          Reflect.deleteProperty(other, "user");
          Reflect.deleteProperty(other, "counterparty");
          await entryRepository.save(manager, other);
        });

        const summary = await loadEntrySummary(entry.id);
        if (!summary) {
          throw new HttpError(500, "Failed to load entry");
        }
        return summary;
      }

      if (entry.type === "reserve_withdraw") {
        if (input.type !== undefined) {
          throw new HttpError(400, "Cannot change reserve withdraw type");
        }
        if (input.visibility !== undefined) {
          throw new HttpError(400, "Reserve withdraw stays personal");
        }
        if (input.cardLines !== undefined) {
          throw new HttpError(400, "Reserve withdraw cannot have card lines");
        }
        if (installmentScope === "forward") {
          throw new HttpError(400, "Reserve withdraw has no installment scope");
        }

        const potId = input.reservePotId ?? entry.reservePotId;
        if (!potId) {
          throw new HttpError(
            400,
            "reservePotId is required for reserve withdraw"
          );
        }
        await reservePotService.requireOwnPot(userId, entry.spaceId, potId);
        const category = await resolveSavingCategory(entry.spaceId);
        entry.categoryId = category.id;
        entry.visibility = "personal";
        entry.reservePotId = potId;
        if (input.amount !== undefined) entry.amount = input.amount.toFixed(2);
        if (input.description !== undefined)
          entry.description = input.description;
        if (input.occurredOn) entry.occurredOn = input.occurredOn;

        Reflect.deleteProperty(entry, "category");
        Reflect.deleteProperty(entry, "user");
        Reflect.deleteProperty(entry, "reservePot");
        Reflect.deleteProperty(entry, "cardLines");
        await entryRepository.save(dataSource.manager, entry);

        const summary = await loadEntrySummary(entry.id);
        if (!summary) {
          throw new HttpError(500, "Failed to load entry");
        }
        return summary;
      }

      const nextType = input.type ?? entry.type;

      if (nextType === "saving") {
        const potId = input.reservePotId ?? entry.reservePotId;
        if (!potId) {
          throw new HttpError(
            400,
            "reservePotId is required for saving entries"
          );
        }
        await reservePotService.requireOwnPot(userId, entry.spaceId, potId);
        const category = await resolveSavingCategory(entry.spaceId);
        entry.type = "saving";
        entry.categoryId = category.id;
        entry.visibility = "personal";
        entry.reservePotId = potId;
      } else {
        if (input.categoryId) {
          await requireOwnCategory(entry.spaceId, input.categoryId);
          entry.categoryId = input.categoryId;
        } else if (entry.type === "saving" || !entry.categoryId) {
          throw new HttpError(
            400,
            "categoryId is required when changing from saving"
          );
        }
        entry.type = nextType;
        entry.reservePotId = null;
        if (input.visibility) entry.visibility = input.visibility;
      }

      if (input.amount !== undefined) {
        entry.amount = input.amount.toFixed(2);
        if (entry.cardInstallmentSeeded) {
          entry.cardInstallmentSeeded = false;
        }
      }
      if (input.description !== undefined) {
        entry.description = input.description;
        if (entry.cardInstallmentSeeded) {
          entry.cardInstallmentSeeded = false;
        }
      }
      if (input.occurredOn) entry.occurredOn = input.occurredOn;

      if (
        nextType !== "expense" &&
        input.cardLines !== undefined &&
        input.cardLines.length > 0
      ) {
        throw new HttpError(400, "cardLines are only allowed on expenses");
      }

      await dataSource.transaction(async (manager) => {
        await entryRepository.save(manager, entry);
        if (nextType !== "expense") {
          await entryCardLineRepository.replaceForEntry(manager, entry.id, []);
        } else if (input.cardLines !== undefined) {
          await replaceCardLines(
            manager,
            entry.id,
            entry.spaceId,
            Number(entry.amount),
            entry.categoryId,
            input.cardLines
          );
        } else {
          const existing = await entryCardLineRepository.listForEntry(
            entry.id,
            manager
          );
          if (existing.length > 0) {
            assertCardLinesFitAmount(
              Number(entry.amount),
              existing.map((line) => ({
                description: line.description,
                amount: Number(line.amount),
                categoryId: line.categoryId,
              }))
            );
          }
        }

        if (installmentScope !== "forward") {
          return;
        }

        if (entry.installmentPlanId && entry.installmentNumber != null) {
          const siblings = await entryRepository.listInstallmentFromNumber(
            entry.installmentPlanId,
            entry.installmentNumber,
            manager
          );
          for (const sibling of siblings) {
            if (sibling.id === entry.id) {
              continue;
            }
            sibling.type = entry.type;
            sibling.categoryId = entry.categoryId;
            sibling.reservePotId = entry.reservePotId;
            sibling.visibility = entry.visibility;
            sibling.amount = entry.amount;
            sibling.description = entry.description;
            await entryRepository.save(manager, sibling);
          }

          const plan = await installmentPlanRepository.findById(
            entry.installmentPlanId,
            manager
          );
          if (plan) {
            if (entry.categoryId) plan.categoryId = entry.categoryId;
            if (entry.type === "income" || entry.type === "expense") {
              plan.type = entry.type;
            }
            plan.amount = entry.amount;
            plan.description = entry.description;
            plan.visibility = entry.visibility;
            // Avoid stale category relation overwriting categoryId on save.
            Reflect.deleteProperty(plan, "category");
            await installmentPlanRepository.save(manager, plan);
          }
          return;
        }

        if (entry.recurringRuleId) {
          const siblings = await entryRepository.listRecurringFromDate(
            entry.recurringRuleId,
            entry.occurredOn,
            manager
          );
          for (const sibling of siblings) {
            if (sibling.id === entry.id) {
              continue;
            }
            sibling.type = entry.type;
            sibling.categoryId = entry.categoryId;
            sibling.reservePotId = entry.reservePotId;
            sibling.visibility = entry.visibility;
            sibling.amount = entry.amount;
            sibling.description = entry.description;
            await entryRepository.save(manager, sibling);
          }

          const rule = await recurringRuleRepository.findById(
            entry.recurringRuleId,
            manager
          );
          if (rule) {
            if (entry.categoryId) rule.categoryId = entry.categoryId;
            if (entry.type === "income" || entry.type === "expense") {
              rule.type = entry.type;
            }
            rule.amount = entry.amount;
            rule.description = entry.description;
            rule.visibility = entry.visibility;
            Reflect.deleteProperty(rule, "category");
            await recurringRuleRepository.save(manager, rule);
          }
        }
      });

      const summary = await loadEntrySummary(entry.id);
      if (!summary) {
        throw new HttpError(500, "Failed to load entry");
      }
      await touchSnapshots(
        userId,
        entry.spaceId,
        monthBefore,
        monthKeyFromDate(summary.occurredOn)
      );
      return summary;
    },

    async addCardLine(
      userId: string,
      entryId: string,
      input: AddEntryCardLineBody
    ): Promise<EntrySummary> {
      const entry = await entryRepository.findById(entryId, dataSource.manager);
      if (!entry) {
        throw new HttpError(404, "Entry not found");
      }
      if (entry.userId !== userId) {
        throw new HttpError(403, "You can only edit your own entries");
      }
      await requireMember(userId, entry.spaceId);
      if (entry.type !== "expense") {
        throw new HttpError(400, "cardLines are only allowed on expenses");
      }
      if (!entry.categoryId) {
        throw new HttpError(400, "Category required for statement detail");
      }
      const parentCategory = await requireOwnCategory(
        entry.spaceId,
        entry.categoryId
      );
      if (!parentCategory.lineDetailEnabled) {
        throw new HttpError(
          400,
          "This category does not allow statement detail"
        );
      }
      await requireOwnCategory(entry.spaceId, input.categoryId);

      const existingLines = entry.cardLines ?? [];
      const nextLines = [
        ...existingLines.map((line) => ({
          description: line.description,
          amount: Number(line.amount),
          categoryId: line.categoryId,
        })),
        {
          description: input.description,
          amount: input.amount,
          categoryId: input.categoryId,
        },
      ];
      // Seeded statements sync total to sum(lines); manual totals keep amount (Outros shrinks).
      if (!entry.cardInstallmentSeeded) {
        assertCardLinesFitAmount(Number(entry.amount), nextLines);
      }

      const installmentCount = input.installmentCount;
      const isRecurring = input.recurring === true;
      const installmentGroupId = installmentCount != null ? randomUUID() : null;
      const recurringGroupId = isRecurring ? randomUUID() : null;
      const startMonth = entry.occurredOn.slice(0, 7);

      await dataSource.transaction(async (manager) => {
        await appendCardLine(manager, entry.id, {
          categoryId: input.categoryId,
          description: input.description,
          amount: input.amount,
          installmentGroupId,
          installmentNumber: installmentCount != null ? 1 : null,
          installmentCount: installmentCount ?? null,
          recurringGroupId,
        });

        if (entry.cardInstallmentSeeded) {
          const lines = await entryCardLineRepository.listForEntry(
            entry.id,
            manager
          );
          await entryRepository.updateAmount(
            manager,
            entry.id,
            lines.reduce((sum, row) => sum + Number(row.amount), 0).toFixed(2)
          );
        }

        if (installmentCount == null) {
          return;
        }

        const schedule = remainingInstallmentSchedule(
          startMonth,
          1,
          installmentCount
        ).filter((item) => item.number > 1);

        for (const item of schedule) {
          const target = await ensureCardStatementEntry(manager, {
            spaceId: entry.spaceId,
            userId,
            categoryId: entry.categoryId!,
            visibility: entry.visibility,
            month: item.month,
            lineAmount: input.amount,
          });

          await appendCardLine(manager, target.id, {
            categoryId: input.categoryId,
            description: input.description,
            amount: input.amount,
            installmentGroupId,
            installmentNumber: item.number,
            installmentCount,
          });

          // Seeded: sync total to sum(lines). Manual: bump by parcel so Outros stays
          // (parcel is new bank spend, not something already inside the hand total).
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
          } else {
            await entryRepository.updateAmount(
              manager,
              target.id,
              (Number(target.amount) + input.amount).toFixed(2)
            );
          }
        }
      });

      const summary = await loadEntrySummary(entry.id);
      if (!summary) {
        throw new HttpError(500, "Failed to load entry");
      }
      await touchSnapshots(
        userId,
        entry.spaceId,
        monthKeyFromDate(entry.occurredOn)
      );
      return summary;
    },

    async updateCardLine(
      userId: string,
      entryId: string,
      lineId: string,
      input: UpdateEntryCardLineBody
    ): Promise<EntrySummary> {
      const entry = await entryRepository.findById(entryId, dataSource.manager);
      if (!entry) {
        throw new HttpError(404, "Entry not found");
      }
      if (entry.userId !== userId) {
        throw new HttpError(403, "You can only edit your own entries");
      }
      await requireMember(userId, entry.spaceId);
      await requireOwnCategory(entry.spaceId, input.categoryId);

      const line = await entryCardLineRepository.findById(
        lineId,
        dataSource.manager
      );
      if (!line || line.entryId !== entryId) {
        throw new HttpError(404, "Card line not found");
      }

      const scope = input.scope ?? "one";
      const inSeries = Boolean(
        line.installmentGroupId || line.recurringGroupId
      );
      if (scope === "forward" && !inSeries) {
        throw new HttpError(
          400,
          "scope forward is only for installment or recurring card lines"
        );
      }

      await dataSource.transaction(async (manager) => {
        let targets: EntryCardLine[] = [line];
        if (scope === "forward" && line.installmentGroupId) {
          const groupLines =
            await entryCardLineRepository.findByInstallmentGroup(
              line.installmentGroupId,
              manager
            );
          targets = cardLinesForwardFrom(line, groupLines);
        } else if (scope === "forward" && line.recurringGroupId) {
          const groupLines = await entryCardLineRepository.findByRecurringGroup(
            line.recurringGroupId,
            manager
          );
          targets = cardLinesForwardFrom(line, groupLines);
        }

        for (const target of targets) {
          target.description = input.description;
          target.amount = input.amount.toFixed(2);
          target.categoryId = input.categoryId;
          Reflect.deleteProperty(target, "category");
          await entryCardLineRepository.save(manager, target);
        }

        // Editing only this occurrence: detach so future ensure/materialize
        // templates stay on the remaining series (past untouched).
        if (scope === "one" && inSeries) {
          line.installmentGroupId = null;
          line.installmentNumber = null;
          line.installmentCount = null;
          line.recurringGroupId = null;
          await entryCardLineRepository.save(manager, line);
        }

        const affectedEntryIds = [
          ...new Set(targets.map((row) => row.entryId)),
        ];
        for (const affectedId of affectedEntryIds) {
          await reconcileStatementAmount(manager, affectedId);
        }
      });

      const summary = await loadEntrySummary(entryId);
      if (!summary) {
        throw new HttpError(500, "Failed to load entry");
      }
      await touchSnapshots(
        userId,
        entry.spaceId,
        monthKeyFromDate(entry.occurredOn)
      );
      return summary;
    },

    async removeCardLine(
      userId: string,
      entryId: string,
      lineId: string,
      scope: InstallmentDeleteScope = "one"
    ): Promise<EntrySummary | null> {
      const entry = await entryRepository.findById(entryId, dataSource.manager);
      if (!entry) {
        throw new HttpError(404, "Entry not found");
      }
      if (entry.userId !== userId) {
        throw new HttpError(403, "You can only edit your own entries");
      }
      await requireMember(userId, entry.spaceId);

      const line = await entryCardLineRepository.findById(
        lineId,
        dataSource.manager
      );
      if (!line || line.entryId !== entryId) {
        throw new HttpError(404, "Card line not found");
      }

      const inSeries = Boolean(
        line.installmentGroupId || line.recurringGroupId
      );
      if (scope === "forward" && !inSeries) {
        throw new HttpError(
          400,
          "scope forward is only for installment or recurring card lines"
        );
      }

      await dataSource.transaction(async (manager) => {
        let linesToRemove: EntryCardLine[] = [line];
        const recurringGroupId = line.recurringGroupId;
        const installmentGroupId = line.installmentGroupId;

        if (scope === "forward" && installmentGroupId) {
          const groupLines =
            await entryCardLineRepository.findByInstallmentGroup(
              installmentGroupId,
              manager
            );
          linesToRemove = cardLinesForwardFrom(line, groupLines);
        } else if (scope === "forward" && recurringGroupId) {
          const groupLines = await entryCardLineRepository.findByRecurringGroup(
            recurringGroupId,
            manager
          );
          linesToRemove = cardLinesForwardFrom(line, groupLines);
          // Past months keep amounts as one-offs; stop ensureThrough for this group.
          for (const pastLine of groupLines) {
            if (linesToRemove.some((row) => row.id === pastLine.id)) {
              continue;
            }
            pastLine.recurringGroupId = null;
            await entryCardLineRepository.save(manager, pastLine);
          }
          await entryCardRecurringSkipRepository.removeForGroup(
            manager,
            recurringGroupId
          );
        } else if (scope === "one" && recurringGroupId) {
          // Keep the series alive; skip this month so ensureThrough won't recreate it.
          await entryCardRecurringSkipRepository.ensureSkip(manager, {
            recurringGroupId,
            month: cardLineMonth(line) || entry.occurredOn.slice(0, 7),
          });
        }

        const affectedEntryIds = [
          ...new Set(linesToRemove.map((row) => row.entryId)),
        ];

        await entryCardLineRepository.removeByIds(
          manager,
          linesToRemove.map((row) => row.id)
        );

        for (const affectedId of affectedEntryIds) {
          await reconcileStatementAmount(manager, affectedId);
        }
      });

      // Statement may have been removed if it was seeded and emptied.
      const summary = await loadEntrySummary(entryId);
      if (summary) {
        await touchSnapshots(
          userId,
          entry.spaceId,
          monthKeyFromDate(entry.occurredOn)
        );
      }
      return summary;
    },

    async remove(
      userId: string,
      entryId: string,
      installmentScope: InstallmentDeleteScope = "one"
    ): Promise<void> {
      const entry = await entryRepository.findById(entryId, dataSource.manager);
      if (!entry) {
        throw new HttpError(404, "Entry not found");
      }
      if (entry.userId !== userId) {
        throw new HttpError(403, "You can only delete your own entries");
      }
      await requireMember(userId, entry.spaceId);
      const removeMonth = monthKeyFromDate(entry.occurredOn);

      if (entry.transferGroupId) {
        const pair = await entryRepository.findByTransferGroup(
          entry.transferGroupId,
          dataSource.manager
        );
        for (const row of pair) {
          await entryRepository.remove(dataSource.manager, row);
        }
        await touchSnapshots(userId, entry.spaceId, removeMonth);
        const peer = pair.find((row) => row.userId !== userId);
        if (peer) {
          await touchSnapshots(peer.userId, entry.spaceId, removeMonth);
        }
        return;
      }

      if (
        installmentScope === "forward" &&
        entry.installmentPlanId &&
        entry.installmentNumber != null
      ) {
        const planId = entry.installmentPlanId;
        await entryRepository.removeInstallmentFromNumber(
          planId,
          entry.installmentNumber,
          dataSource.manager
        );
        const left = await entryRepository.countForInstallmentPlan(
          planId,
          dataSource.manager
        );
        if (left === 0) {
          const plan = await installmentPlanRepository.findById(
            planId,
            dataSource.manager
          );
          if (plan) {
            await installmentPlanRepository.remove(dataSource.manager, plan);
          }
        }
        await touchSnapshots(userId, entry.spaceId, removeMonth);
        return;
      }

      if (entry.recurringRuleId) {
        const month = entry.occurredOn.slice(0, 7);
        const existingSkip = await recurrenceSkipRepository.find(
          entry.recurringRuleId,
          month,
          dataSource.manager
        );
        if (!existingSkip) {
          await recurrenceSkipRepository.create(dataSource.manager, {
            spaceId: entry.spaceId,
            userId,
            recurringRuleId: entry.recurringRuleId,
            month,
          });
        }
      }

      const planId = entry.installmentPlanId;
      await entryRepository.remove(dataSource.manager, entry);

      if (planId) {
        const left = await entryRepository.countForInstallmentPlan(
          planId,
          dataSource.manager
        );
        if (left === 0) {
          const plan = await installmentPlanRepository.findById(
            planId,
            dataSource.manager
          );
          if (plan) {
            await installmentPlanRepository.remove(dataSource.manager, plan);
          }
        }
      }

      await touchSnapshots(userId, entry.spaceId, removeMonth);
    },
  };
}

export type EntryService = ReturnType<typeof createEntryService>;
