import type { FastifyRequest } from "fastify";
import {
  createCategoryBodySchema,
  updateCategoryBodySchema,
} from "@homewallet/shared";
import type { CategoryService } from "../services/category.service.js";

type SpaceParams = { spaceId: string };
type CategoryParams = { spaceId: string; categoryId: string };

export function createCategoryController(categoryService: CategoryService) {
  return {
    list(request: FastifyRequest<{ Params: SpaceParams }>) {
      return categoryService.list(request.user.sub, request.params.spaceId);
    },

    create(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = createCategoryBodySchema.parse(request.body);
      return categoryService.create(
        request.user.sub,
        request.params.spaceId,
        body
      );
    },

    update(request: FastifyRequest<{ Params: CategoryParams }>) {
      const body = updateCategoryBodySchema.parse(request.body);
      return categoryService.update(
        request.user.sub,
        request.params.spaceId,
        request.params.categoryId,
        body
      );
    },
  };
}

export type CategoryController = ReturnType<typeof createCategoryController>;
