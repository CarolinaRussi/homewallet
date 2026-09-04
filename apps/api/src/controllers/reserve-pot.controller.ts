import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createReservePotBodySchema,
  updateReservePotBodySchema,
} from "@homewallet/shared";
import type { ReservePotService } from "../services/reserve-pot.service.js";

type SpaceParams = { spaceId: string };
type PotParams = { potId: string };

export function createReservePotController(
  reservePotService: ReservePotService
) {
  return {
    list(request: FastifyRequest<{ Params: SpaceParams }>) {
      return reservePotService.list(request.user.sub, request.params.spaceId);
    },

    create(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = createReservePotBodySchema.parse(request.body);
      return reservePotService.create(
        request.user.sub,
        request.params.spaceId,
        body
      );
    },

    update(request: FastifyRequest<{ Params: PotParams }>) {
      const body = updateReservePotBodySchema.parse(request.body);
      return reservePotService.rename(
        request.user.sub,
        request.params.potId,
        body
      );
    },

    async remove(
      request: FastifyRequest<{ Params: PotParams }>,
      reply: FastifyReply
    ) {
      await reservePotService.remove(request.user.sub, request.params.potId);
      return reply.code(204).send();
    },
  };
}

export type ReservePotController = ReturnType<
  typeof createReservePotController
>;
