import type { DataSource } from "typeorm";
import type {
  CreateInstallmentPlanBody,
  CreateRecurringRuleBody,
  InstallmentPlanSummary,
  RecurringRuleSummary,
} from "@homewallet/shared";
import {
  monthToOccurredOn,
  remainingInstallmentSchedule,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { InstallmentPlan } from "../db/entities/installment-plan.entity.js";
import { RecurringRule } from "../db/entities/recurring-rule.entity.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { installmentPlanRepository } from "../repositories/installment-plan.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { recurringRuleRepository } from "../repositories/recurring-rule.repository.js";
import { ensureCardRecurringThrough } from "./card-recurring-generate.js";
import type { MonthSnapshotService } from "./month-snapshot.service.js";
import { ensureRecurringThrough } from "./recurrence-generate.js";

const ensureThroughInflight = new Map<string, Promise<boolean>>();

function toRuleSummary(rule: RecurringRule): RecurringRuleSummary {
  return {
    id: rule.id,
    type: rule.type,
    amount: Number(rule.amount),
    categoryId: rule.categoryId,
    categoryName: rule.category.name,
    description: rule.description,
    visibility: rule.visibility,
    startMonth: rule.startMonth,
    endMonth: rule.endMonth,
  };
}

function toPlanSummary(plan: InstallmentPlan): InstallmentPlanSummary {
  return {
    id: plan.id,
    type: plan.type,
    amount: Number(plan.amount),
    installmentCount: plan.installmentCount,
    categoryId: plan.categoryId,
    categoryName: plan.category.name,
    description: plan.description,
    visibility: plan.visibility,
    startMonth: plan.startMonth,
  };
}

export function createRecurringService(
  dataSource: DataSource,
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

  async function requireCategory(spaceId: string, categoryId: string) {
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

  async function ensureThrough(
    userId: string,
    spaceId: string,
    throughMonth: string
  ): Promise<boolean> {
    const key = `${spaceId}:${userId}:${throughMonth}`;
    const inflight = ensureThroughInflight.get(key);
    if (inflight) {
      return inflight;
    }

    const run = (async () => {
      const recurring = await ensureRecurringThrough(
        dataSource,
        spaceId,
        userId,
        throughMonth
      );
      const card = await ensureCardRecurringThrough(
        dataSource,
        spaceId,
        userId,
        throughMonth
      );
      return recurring || card;
    })();

    ensureThroughInflight.set(key, run);
    try {
      return await run;
    } finally {
      ensureThroughInflight.delete(key);
    }
  }

  return {
    ensureThrough,

    async listRules(
      userId: string,
      spaceId: string
    ): Promise<RecurringRuleSummary[]> {
      await requireMember(userId, spaceId);
      const rules = await recurringRuleRepository.listForUser(
        spaceId,
        userId,
        dataSource.manager
      );
      return rules.map(toRuleSummary);
    },

    async createRule(
      userId: string,
      spaceId: string,
      input: CreateRecurringRuleBody
    ): Promise<RecurringRuleSummary> {
      await requireMember(userId, spaceId);
      await requireCategory(spaceId, input.categoryId);
      if (input.endMonth && input.endMonth < input.startMonth) {
        throw new HttpError(400, "endMonth must be on or after startMonth");
      }

      const rule = await recurringRuleRepository.create(dataSource.manager, {
        spaceId,
        userId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount.toFixed(2),
        description: input.description,
        visibility: input.visibility,
        startMonth: input.startMonth,
        endMonth: input.endMonth,
      });

      const loaded = await recurringRuleRepository.findById(
        rule.id,
        dataSource.manager
      );
      if (!loaded) {
        throw new HttpError(500, "Failed to load recurring rule");
      }
      await ensureThrough(userId, spaceId, input.startMonth);
      monthSnapshotService.touch(userId, spaceId, input.startMonth);
      return toRuleSummary(loaded);
    },

    async removeRule(userId: string, ruleId: string) {
      const rule = await recurringRuleRepository.findById(
        ruleId,
        dataSource.manager
      );
      if (!rule) {
        throw new HttpError(404, "Recurring rule not found");
      }
      if (rule.userId !== userId) {
        throw new HttpError(
          403,
          "You can only delete your own recurring rules"
        );
      }
      await requireMember(userId, rule.spaceId);
      await recurringRuleRepository.remove(dataSource.manager, rule);
    },

    async listPlans(
      userId: string,
      spaceId: string
    ): Promise<InstallmentPlanSummary[]> {
      await requireMember(userId, spaceId);
      const plans = await installmentPlanRepository.listForUser(
        spaceId,
        userId,
        dataSource.manager
      );
      return plans.map(toPlanSummary);
    },

    async createPlan(
      userId: string,
      spaceId: string,
      input: CreateInstallmentPlanBody
    ): Promise<InstallmentPlanSummary> {
      await requireMember(userId, spaceId);
      await requireCategory(spaceId, input.categoryId);

      const plan = await installmentPlanRepository.create(dataSource.manager, {
        spaceId,
        userId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount.toFixed(2),
        installmentCount: input.installmentCount,
        description: input.description,
        visibility: input.visibility,
        startMonth: input.startMonth,
      });

      const schedule = remainingInstallmentSchedule(
        input.startMonth,
        input.firstInstallmentNumber,
        input.installmentCount
      );
      for (const item of schedule) {
        const label = input.description
          ? `${input.description} (${item.number}/${input.installmentCount})`
          : `${item.number}/${input.installmentCount}`;
        await entryRepository.create(dataSource.manager, {
          spaceId,
          userId,
          categoryId: input.categoryId,
          type: input.type,
          amount: input.amount.toFixed(2),
          description: label,
          visibility: input.visibility,
          occurredOn: monthToOccurredOn(item.month),
          recurringRuleId: null,
          installmentPlanId: plan.id,
          installmentNumber: item.number,
        });
      }

      const loaded = await installmentPlanRepository.findById(
        plan.id,
        dataSource.manager
      );
      if (!loaded) {
        throw new HttpError(500, "Failed to load installment plan");
      }
      monthSnapshotService.touch(userId, spaceId, input.startMonth);
      return toPlanSummary(loaded);
    },

    async removePlan(userId: string, planId: string) {
      const plan = await installmentPlanRepository.findById(
        planId,
        dataSource.manager
      );
      if (!plan) {
        throw new HttpError(404, "Installment plan not found");
      }
      if (plan.userId !== userId) {
        throw new HttpError(
          403,
          "You can only delete your own installment plans"
        );
      }
      await requireMember(userId, plan.spaceId);
      await entryRepository.removeByInstallmentPlan(planId, dataSource.manager);
      await installmentPlanRepository.remove(dataSource.manager, plan);
      monthSnapshotService.touch(userId, plan.spaceId, plan.startMonth);
    },
  };
}

export type RecurringService = ReturnType<typeof createRecurringService>;
