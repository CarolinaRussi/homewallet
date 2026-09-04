import type { FastifyRequest } from "fastify";
import {
  createSpaceBodySchema,
  joinSpaceBodySchema,
  monthQuerySchema,
  updateMyLimitsBodySchema,
  updateSpaceBodySchema,
} from "@homewallet/shared";
import type { SpaceService } from "../services/space.service.js";

type SpaceParams = { id: string };
type MonthQuery = { month?: string };

function resolveMonth(query: MonthQuery) {
  if (query.month) {
    return monthQuerySchema.parse(query.month);
  }
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function createSpaceController(spaceService: SpaceService) {
  return {
    list(request: FastifyRequest) {
      return spaceService.listForUser(request.user.sub);
    },

    get(request: FastifyRequest<{ Params: SpaceParams }>) {
      return spaceService.getForMember(request.user.sub, request.params.id);
    },

    create(request: FastifyRequest) {
      const body = createSpaceBodySchema.parse(request.body);
      return spaceService.createForOwner(request.user.sub, body);
    },

    join(request: FastifyRequest) {
      const body = joinSpaceBodySchema.parse(request.body);
      return spaceService.join(request.user.sub, body.joinCode);
    },

    update(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = updateSpaceBodySchema.parse(request.body);
      return spaceService.updateSettings(
        request.user.sub,
        request.params.id,
        body
      );
    },

    updateMyLimits(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = updateMyLimitsBodySchema.parse(request.body);
      return spaceService.updateMyLimits(
        request.user.sub,
        request.params.id,
        body
      );
    },

    spaceMonth(
      request: FastifyRequest<{
        Params: SpaceParams;
        Querystring: MonthQuery;
      }>
    ) {
      return spaceService.getSpaceMonth(
        request.user.sub,
        request.params.id,
        resolveMonth(request.query)
      );
    },
  };
}

export type SpaceController = ReturnType<typeof createSpaceController>;
