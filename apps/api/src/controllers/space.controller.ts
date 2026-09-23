import type { FastifyRequest } from "fastify";
import {
  createSpaceBodySchema,
  historyImportPreviewBodySchema,
  inviteSpaceEmailBodySchema,
  joinSpaceBodySchema,
  monthQuerySchema,
  updateMyLimitsBodySchema,
  updateSpaceBodySchema,
} from "@homewallet/shared";
import type { SpaceHistoryService } from "../services/space-history.service.js";
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

export function createSpaceController(
  spaceService: SpaceService,
  spaceHistoryService: SpaceHistoryService
) {
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

    listMembers(request: FastifyRequest<{ Params: SpaceParams }>) {
      return spaceService.listMembers(request.user.sub, request.params.id);
    },

    promoteMember(
      request: FastifyRequest<{
        Params: SpaceParams & { userId: string };
      }>
    ) {
      return spaceService.promoteMember(
        request.user.sub,
        request.params.id,
        request.params.userId
      );
    },

    regenerateJoinCode(request: FastifyRequest<{ Params: SpaceParams }>) {
      return spaceService.regenerateJoinCode(
        request.user.sub,
        request.params.id
      );
    },

    inviteEmail(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = inviteSpaceEmailBodySchema.parse(request.body);
      return spaceService.inviteByEmail(
        request.user.sub,
        request.params.id,
        body.email
      );
    },

    leave(request: FastifyRequest<{ Params: SpaceParams }>) {
      return spaceService.leave(request.user.sub, request.params.id);
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

    listHistoryImportSources(request: FastifyRequest<{ Params: SpaceParams }>) {
      return spaceHistoryService.listEligibleSources(
        request.user.sub,
        request.params.id
      );
    },

    previewHistoryImport(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = historyImportPreviewBodySchema.parse(request.body);
      return spaceHistoryService.previewImport(
        request.user.sub,
        request.params.id,
        body.sourceSpaceId
      );
    },
  };
}

export type SpaceController = ReturnType<typeof createSpaceController>;
