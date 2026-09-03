import type { FastifyRequest } from "fastify";
import {
  createSpaceBodySchema,
  joinSpaceBodySchema,
  updateSpaceBodySchema,
} from "@homewallet/shared";
import type { SpaceService } from "../services/space.service.js";

type SpaceParams = { id: string };

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
  };
}

export type SpaceController = ReturnType<typeof createSpaceController>;
