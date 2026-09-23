import type { DataSource } from "typeorm";
import type {
  HistoryImportExecuteResult,
  HistoryImportPreview,
  HistoryImportSourceSummary,
  HistoryImportWarning,
} from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import {
  hashCategoryMap,
  isEligibleSoloSource,
  mapSourceCategories,
  mergePotsByName,
  resolveImportCategoryRemap,
  signHistoryPreviewToken,
  transferImportWarnings,
  verifyHistoryPreviewToken,
} from "../lib/history-import.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { installmentPlanRepository } from "../repositories/installment-plan.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { recurringRuleRepository } from "../repositories/recurring-rule.repository.js";
import { reservePotRepository } from "../repositories/reserve-pot.repository.js";
import { spaceHistoryRepository } from "../repositories/space-history.repository.js";
import { spaceRepository } from "../repositories/space.repository.js";
import { currentMonthKey } from "./month-snapshot.build.js";
import type { MonthSnapshotService } from "./month-snapshot.service.js";

export function createSpaceHistoryService(
  dataSource: DataSource,
  jwtSecret: string,
  monthSnapshotService: MonthSnapshotService
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

    async executeImport(
      userId: string,
      targetSpaceId: string,
      input: {
        sourceSpaceId: string;
        previewToken: string;
        categoryMap: Record<string, string>;
      }
    ): Promise<HistoryImportExecuteResult> {
      let claims;
      try {
        claims = verifyHistoryPreviewToken(input.previewToken, jwtSecret);
      } catch {
        throw new HttpError(400, "Invalid or expired preview token");
      }
      if (
        claims.userId !== userId ||
        claims.sourceSpaceId !== input.sourceSpaceId ||
        claims.targetSpaceId !== targetSpaceId
      ) {
        throw new HttpError(400, "Invalid or expired preview token");
      }

      const result = await dataSource.transaction(async (manager) => {
        const targetMembership = await membershipRepository.findMembership(
          userId,
          targetSpaceId,
          manager
        );
        const sourceMembership = await membershipRepository.findMembership(
          userId,
          input.sourceSpaceId,
          manager
        );
        if (!targetMembership || !sourceMembership) {
          throw new HttpError(404, "Space not found");
        }
        const alreadyImported = await spaceHistoryRepository.findImportMove(
          userId,
          input.sourceSpaceId,
          targetSpaceId,
          manager
        );
        if (alreadyImported) {
          throw new HttpError(409, "History already imported from this space");
        }
        const sourceCount = await membershipRepository.countForSpace(
          input.sourceSpaceId,
          manager
        );
        if (
          !isEligibleSoloSource({
            sourceSpaceId: input.sourceSpaceId,
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

        await spaceHistoryRepository.lockActorEntries(
          input.sourceSpaceId,
          userId,
          manager
        );

        const [
          stats,
          usedCategoryIds,
          counterparties,
          recurringRules,
          installmentPlans,
          sourceCategories,
          targetCategories,
          targetMembers,
          sourcePots,
          targetPots,
        ] = await Promise.all([
          spaceHistoryRepository.entryStats(
            input.sourceSpaceId,
            userId,
            manager
          ),
          spaceHistoryRepository.usedCategoryIds(
            input.sourceSpaceId,
            userId,
            manager
          ),
          spaceHistoryRepository.transferCounterparties(
            input.sourceSpaceId,
            userId,
            manager
          ),
          recurringRuleRepository.listForUser(
            input.sourceSpaceId,
            userId,
            manager
          ),
          installmentPlanRepository.listForUser(
            input.sourceSpaceId,
            userId,
            manager
          ),
          categoryRepository.listForSpace(input.sourceSpaceId, manager),
          categoryRepository.listForSpace(targetSpaceId, manager),
          membershipRepository.listForSpace(targetSpaceId, manager),
          reservePotRepository.listForUser(
            input.sourceSpaceId,
            userId,
            manager
          ),
          reservePotRepository.listForUser(targetSpaceId, userId, manager),
        ]);
        for (const rule of recurringRules) {
          usedCategoryIds.add(rule.categoryId);
        }
        for (const plan of installmentPlans) {
          usedCategoryIds.add(plan.categoryId);
        }

        const transferBlock = transferImportWarnings(
          counterparties,
          new Set(targetMembers.map((member) => member.userId)),
          userId
        );
        if (transferBlock.length > 0) {
          throw new HttpError(
            400,
            "Import blocked: transfers to someone not in this space"
          );
        }

        const targetCategoryIds = new Set(
          targetCategories.map((category) => category.id)
        );
        for (const targetCategoryId of Object.values(input.categoryMap)) {
          if (!targetCategoryIds.has(targetCategoryId)) {
            throw new HttpError(400, "Invalid category mapping");
          }
        }

        const usedSource = sourceCategories.filter((category) =>
          usedCategoryIds.has(category.id)
        );
        const autoRows = mapSourceCategories(usedSource, targetCategories);
        const resolved = resolveImportCategoryRemap(
          autoRows,
          input.categoryMap
        );
        const categoryRemap = { ...resolved.remap };
        for (const item of resolved.createNames) {
          const sourceCategory = usedSource.find(
            (category) => category.id === item.sourceCategoryId
          );
          const existing = await categoryRepository.findByName(
            targetSpaceId,
            item.name,
            manager
          );
          if (existing) {
            categoryRemap[item.sourceCategoryId] = existing.id;
            continue;
          }
          const created = await categoryRepository.create(manager, {
            spaceId: targetSpaceId,
            name: item.name,
            isDefault: false,
            budgetLayer: sourceCategory?.budgetLayer ?? null,
            lineDetailEnabled: sourceCategory?.lineDetailEnabled ?? false,
          });
          categoryRemap[item.sourceCategoryId] = created.id;
        }

        const { potRemap } = mergePotsByName(sourcePots, targetPots);
        await spaceHistoryRepository.applyCategoryRemap(
          input.sourceSpaceId,
          userId,
          categoryRemap,
          manager
        );
        await spaceHistoryRepository.applyPotRemap(potRemap, manager);
        await spaceHistoryRepository.moveActorRowsToSpace(
          input.sourceSpaceId,
          targetSpaceId,
          userId,
          manager
        );
        await spaceHistoryRepository.createMove(manager, {
          userId,
          sourceSpaceId: input.sourceSpaceId,
          targetSpaceId,
          direction: "import",
          entryCount: stats.entryCount,
          movedAt: new Date(),
          previewHash: hashCategoryMap(
            Object.entries(categoryRemap).map(
              ([sourceCategoryId, targetCategoryId]) => ({
                sourceCategoryId,
                targetCategoryId,
              })
            )
          ),
        });
        await spaceRepository.remove(manager, sourceMembership.space);
        return {
          targetSpaceId,
          sourceDeleted: true,
          entryCount: stats.entryCount,
          monthFrom: stats.monthFrom,
        };
      });

      monthSnapshotService.touch(
        userId,
        targetSpaceId,
        result.monthFrom ?? currentMonthKey()
      );
      return {
        targetSpaceId: result.targetSpaceId,
        sourceDeleted: result.sourceDeleted,
        entryCount: result.entryCount,
      };
    },
  };
}

export type SpaceHistoryService = ReturnType<typeof createSpaceHistoryService>;
