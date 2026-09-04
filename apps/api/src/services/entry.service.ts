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
import type { ReservePotService } from "./reserve-pot.service.js";

export type InstallmentDeleteScope = "one" | "forward";

export function createEntryService(
  dataSource: DataSource,
  recurringService: RecurringService,
  reservePotService: ReservePotService
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

  async function resolveSavingCategory(spaceId: string) {
    return categoryRepository.ensureSavingCategory(spaceId, dataSource.manager);
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
        });
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
      const entry = await entryRepository.create(dataSource.manager, {
        spaceId,
        userId,
        categoryId: input.categoryId!,
        type: input.type,
        amount: input.amount.toFixed(2),
        description: input.description,
        visibility: input.visibility,
        occurredOn: input.occurredOn,
        recurringRuleId: null,
        installmentPlanId: null,
        installmentNumber: null,
        reservePotId: null,
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
        } else if (entry.type === "saving") {
          throw new HttpError(
            400,
            "categoryId is required when changing from saving"
          );
        }
        entry.type = nextType;
        entry.reservePotId = null;
        if (input.visibility) entry.visibility = input.visibility;
      }

      if (input.amount !== undefined) entry.amount = input.amount.toFixed(2);
      if (input.description !== undefined)
        entry.description = input.description;
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
