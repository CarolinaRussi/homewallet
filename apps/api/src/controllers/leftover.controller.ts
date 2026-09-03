import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createReserveMovementBodySchema,
  monthQuerySchema,
} from "@homewallet/shared";
import type { LeftoverService } from "../services/leftover.service.js";

type SpaceParams = { spaceId: string };
type MovementParams = { movementId: string };
type MonthQuery = { month?: string };

function resolveMonth(query: MonthQuery) {
  if (query.month) {
    return monthQuerySchema.parse(query.month);
  }
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function createLeftoverController(leftoverService: LeftoverService) {
  return {
    monthSummary(
      request: FastifyRequest<{ Params: SpaceParams; Querystring: MonthQuery }>
    ) {
      return leftoverService.getMonthSummary(
        request.user.sub,
        request.params.spaceId,
        resolveMonth(request.query)
      );
    },

    createMovement(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = createReserveMovementBodySchema.parse(request.body);
      return leftoverService.createMovement(
        request.user.sub,
        request.params.spaceId,
        body
      );
    },

    async removeMovement(
      request: FastifyRequest<{ Params: MovementParams }>,
      reply: FastifyReply
    ) {
      await leftoverService.removeMovement(
        request.user.sub,
        request.params.movementId
      );
      return reply.code(204).send();
    },
  };
}

export type LeftoverController = ReturnType<typeof createLeftoverController>;
