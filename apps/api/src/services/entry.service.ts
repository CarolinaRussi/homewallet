import type { DataSource } from "typeorm";
import type {
  CreateEntryBody,
  EntrySummary,
  UpdateEntryBody,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { monthBounds, toEntrySummary } from "../lib/entry-mappers.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { installmentPlanRepository } from "../repositories/installment-plan.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { recurrenceSkipRepository } from "../repositories/recurrence-skip.repository.js";
import type { RecurringService } from "./recurring.service.js";

export type InstallmentDeleteScope = "one" | "forward";

export function createEntryService(
  dataSource: DataSource,
  recurringService: RecurringService
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

  return {
    async listMine(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<EntrySummary[]> {
      await requireMember(userId, spaceId);
      await recurringService.ensureThrough(userId, spaceId, month);
      const { start, end } = monthBounds(month);
      const entries = await entryRepository.listMineForMonth(
        spaceId,
        userId,
        start,
        end,
        dataSource.manager
      );
      return entries.map(toEntrySummary);
    },

    async listShared(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<EntrySummary[]> {
      await requireMember(userId, spaceId);
      const { start, end } = monthBounds(month);
      const entries = await entryRepository.listSharedForMonth(
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
      await requireOwnCategory(spaceId, input.categoryId);
      const entry = await entryRepository.create(dataSource.manager, {
        spaceId,
        userId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount.toFixed(2),
        description: input.description,
        visibility: input.visibility,
        occurredOn: input.occurredOn,
        recurringRuleId: null,
        installmentPlanId: null,
        installmentNumber: null,
      });
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
      const entry = await entryRepository.findById(entryId, dataSource.manager);
      if (!entry) {
        throw new HttpError(404, "Entry not found");
      }
      if (entry.userId !== userId) {
        throw new HttpError(403, "You can only edit your own entries");
      }
      await requireMember(userId, entry.spaceId);

      if (input.categoryId) {
        await requireOwnCategory(entry.spaceId, input.categoryId);
        entry.categoryId = input.categoryId;
      }
      if (input.type) entry.type = input.type;
      if (input.amount !== undefined) entry.amount = input.amount.toFixed(2);
      if (input.description !== undefined)
        entry.description = input.description;
      if (input.visibility) entry.visibility = input.visibility;
      if (input.occurredOn) entry.occurredOn = input.occurredOn;

      await entryRepository.save(dataSource.manager, entry);
      const loaded = await entryRepository.findById(
        entry.id,
        dataSource.manager
      );
      if (!loaded) {
        throw new HttpError(500, "Failed to load entry");
      }
      return toEntrySummary(loaded);
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
    },
  };
}

export type EntryService = ReturnType<typeof createEntryService>;
