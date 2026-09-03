import type { FastifyRequest } from "fastify";
import { createCategoryBodySchema } from "@homewallet/shared";
import type { CategoryService } from "../services/category.service.js";

type SpaceParams = { spaceId: string };

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
  };
}

export type CategoryController = ReturnType<typeof createCategoryController>;
