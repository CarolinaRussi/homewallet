import type { DataSource } from "typeorm";
import type {
  CategorySummary,
  CreateCategoryBody,
  UpdateCategoryBody,
} from "@homewallet/shared";
import { SAVING_CATEGORY_NAME } from "@homewallet/shared";
import { HttpError } from "../lib/http-error.js";
import { toCategorySummary } from "../lib/entry-mappers.js";
import { categoryRepository } from "../repositories/category.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";

export function createCategoryService(dataSource: DataSource) {
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

  return {
    async list(userId: string, spaceId: string): Promise<CategorySummary[]> {
      await requireMember(userId, spaceId);
      let categories = await categoryRepository.listForSpace(
        spaceId,
        dataSource.manager
      );
      if (categories.length === 0) {
        await categoryRepository.seedDefaults(spaceId, dataSource.manager);
        categories = await categoryRepository.listForSpace(
          spaceId,
          dataSource.manager
        );
      } else if (
        !categories.some((category) => category.name === SAVING_CATEGORY_NAME)
      ) {
        await categoryRepository.ensureSavingCategory(
          spaceId,
          dataSource.manager
        );
        categories = await categoryRepository.listForSpace(
          spaceId,
          dataSource.manager
        );
      }
      return categories.map(toCategorySummary);
    },

    async create(
      userId: string,
      spaceId: string,
      input: CreateCategoryBody
    ): Promise<CategorySummary> {
      await requireMember(userId, spaceId);
      const existing = await categoryRepository.findByName(
        spaceId,
        input.name,
        dataSource.manager
      );
      if (existing) {
        throw new HttpError(409, "Category already exists");
      }
      const category = await categoryRepository.create(dataSource.manager, {
        spaceId,
        name: input.name,
        isDefault: false,
        budgetLayer: null,
      });
      return toCategorySummary(category);
    },

    async update(
      userId: string,
      spaceId: string,
      categoryId: string,
      input: UpdateCategoryBody
    ): Promise<CategorySummary> {
      const membership = await requireMember(userId, spaceId);
      if (membership.role !== "owner") {
        throw new HttpError(403, "Only owners can map category layers");
      }
      const category = await categoryRepository.findById(
        categoryId,
        spaceId,
        dataSource.manager
      );
      if (!category) {
        throw new HttpError(404, "Category not found");
      }
      category.budgetLayer = input.budgetLayer;
      await categoryRepository.save(dataSource.manager, category);
      return toCategorySummary(category);
    },

    seedForSpace(spaceId: string, manager = dataSource.manager) {
      return categoryRepository.seedDefaults(spaceId, manager);
    },
  };
}

export type CategoryService = ReturnType<typeof createCategoryService>;
