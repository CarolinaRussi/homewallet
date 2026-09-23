import type { DataSource } from "typeorm";
import type {
  HistoryImportPreview,
  HistoryImportSourceSummary,
  HistoryImportWarning,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import {
  hashCategoryMap,
  isEligibleSoloSource,
  mapSourceCategories,
  signHistoryPreviewToken,
  transferImportWarnings,
} from "../lib/history-import.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { installmentPlanRepository } from "../repositories/installment-plan.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { recurringRuleRepository } from "../repositories/recurring-rule.repository.js";
import { spaceHistoryRepository } from "../repositories/space-history.repository.js";

export function createSpaceHistoryService(
  dataSource: DataSource,
  jwtSecret: string
) {
  async function requireTargetMembership(
    userId: string,
    targetSpaceId: string
  ) {
    const membership = await membershipRepository.findMembership(
      userId,
      targetSpaceId,
      dataSource.manager
    );
    if (!membership) {
      throw new HttpError(404, "Space not found");
    }
    return membership;
  }

  async function importedSourceIds(userId: string, targetSpaceId: string) {
    const moves = await spaceHistoryRepository.listImportMovesForTarget(
      userId,
      targetSpaceId,
      dataSource.manager
    );
    return new Set(
      moves
        .map((move) => move.sourceSpaceId)
        .filter((spaceId): spaceId is string => Boolean(spaceId))
    );
  }

  return {
    async listEligibleSources(
      userId: string,
      targetSpaceId: string
    ): Promise<HistoryImportSourceSummary[]> {
      const targetMembership = await requireTargetMembership(
        userId,
        targetSpaceId
      );
      const memberships = await membershipRepository.findForUser(
        userId,
        dataSource.manager
      );
      const memberCounts = await membershipRepository.countBySpaceIds(
        memberships.map((membershipRow) => membershipRow.spaceId),
        dataSource.manager
      );
      const alreadyImported = await importedSourceIds(userId, targetSpaceId);
      const eligible = memberships.filter((membershipRow) =>
        isEligibleSoloSource({
          sourceSpaceId: membershipRow.spaceId,
          targetSpaceId,
          sourceMemberCount: memberCounts.get(membershipRow.spaceId) ?? 1,
          sourceRole: membershipRow.role,
          sourceCurrency: membershipRow.space.currency,
          targetCurrency: targetMembership.space.currency,
          alreadyImported: alreadyImported.has(membershipRow.spaceId),
        })
      );
      const summaries: HistoryImportSourceSummary[] = [];
      for (const membershipRow of eligible) {
        const stats = await spaceHistoryRepository.entryStats(
          membershipRow.spaceId,
          userId,
          dataSource.manager
        );
        summaries.push({
          id: membershipRow.spaceId,
          name: membershipRow.space.name,
          currency: membershipRow.space.currency,
          entryCount: stats.entryCount,
        });
      }
      return summaries;
    },

    async previewImport(
      userId: string,
      targetSpaceId: string,
      sourceSpaceId: string
    ): Promise<HistoryImportPreview> {
      const targetMembership = await requireTargetMembership(
        userId,
        targetSpaceId
      );
      const sourceMembership = await membershipRepository.findMembership(
        userId,
        sourceSpaceId,
        dataSource.manager
      );
      if (!sourceMembership) {
        throw new HttpError(404, "Space not found");
      }
      const [sourceCount, alreadyImported] = await Promise.all([
        membershipRepository.countForSpace(sourceSpaceId, dataSource.manager),
        spaceHistoryRepository.findImportMove(
          userId,
          sourceSpaceId,
          targetSpaceId,
          dataSource.manager
        ),
      ]);
      if (alreadyImported) {
        throw new HttpError(409, "History already imported from this space");
      }
      if (
        !isEligibleSoloSource({
          sourceSpaceId,
          targetSpaceId,
          sourceMemberCount: sourceCount,
          sourceRole: sourceMembership.role,
          sourceCurrency: sourceMembership.space.currency,
          targetCurrency: targetMembership.space.currency,
          alreadyImported: false,
        })
      ) {
        throw new HttpError(400, "Source is not eligible for import");
      }

      const manager = dataSource.manager;
      const [
        stats,
        usedCategoryIds,
        counterparties,
        reserveBalance,
        recurringRules,
        installmentPlans,
        sourceCategories,
        targetCategories,
        targetMembers,
      ] = await Promise.all([
        spaceHistoryRepository.entryStats(sourceSpaceId, userId, manager),
        spaceHistoryRepository.usedCategoryIds(sourceSpaceId, userId, manager),
        spaceHistoryRepository.transferCounterparties(
          sourceSpaceId,
          userId,
          manager
        ),
        spaceHistoryRepository.reserveBalance(sourceSpaceId, userId, manager),
        recurringRuleRepository.listForUser(sourceSpaceId, userId, manager),
        installmentPlanRepository.listForUser(sourceSpaceId, userId, manager),
        categoryRepository.listForSpace(sourceSpaceId, manager),
        categoryRepository.listForSpace(targetSpaceId, manager),
        membershipRepository.listForSpace(targetSpaceId, manager),
      ]);

      for (const rule of recurringRules) {
        usedCategoryIds.add(rule.categoryId);
      }
      for (const plan of installmentPlans) {
        usedCategoryIds.add(plan.categoryId);
      }

      const categories = mapSourceCategories(
        sourceCategories.filter((category) => usedCategoryIds.has(category.id)),
        targetCategories
      );
      const warnings: HistoryImportWarning[] = [
        ...transferImportWarnings(
          counterparties,
          new Set(targetMembers.map((member) => member.userId)),
          userId
        ),
      ];
      if (
        sourceMembership.space.entryDateMode !==
        targetMembership.space.entryDateMode
      ) {
        warnings.push({ code: "entry_date_mode_differs", blocking: false });
      }

      const previewToken = signHistoryPreviewToken(
        {
          userId,
          sourceSpaceId,
          targetSpaceId,
          mapHash: hashCategoryMap(categories),
        },
        jwtSecret
      );

      return {
        sourceSpaceId,
        targetSpaceId,
        sourceName: sourceMembership.space.name,
        targetName: targetMembership.space.name,
        entryCount: stats.entryCount,
        monthFrom: stats.monthFrom,
        monthTo: stats.monthTo,
        reserveBalance,
        recurringRuleCount: recurringRules.length,
        installmentPlanCount: installmentPlans.length,
        categories,
        warnings,
        previewToken,
      };
    },
  };
}

export type SpaceHistoryService = ReturnType<typeof createSpaceHistoryService>;
