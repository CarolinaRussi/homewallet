import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createEntryBodySchema,
  monthQuerySchema,
  updateEntryBodySchema,
} from "@homewallet/shared";
import type { EntryService } from "../services/entry.service.js";

type SpaceParams = { spaceId: string };
type EntryParams = { entryId: string };
type MonthQuery = { month?: string };
type DeleteQuery = { installmentScope?: string };

function resolveMonth(query: MonthQuery) {
  if (query.month) {
    return monthQuerySchema.parse(query.month);
  }
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function resolveInstallmentScope(query: DeleteQuery) {
  return query.installmentScope === "forward" ? "forward" : "one";
}

export function createEntryController(entryService: EntryService) {
  return {
    listMine(
      request: FastifyRequest<{ Params: SpaceParams; Querystring: MonthQuery }>
    ) {
      return entryService.listMine(
        request.user.sub,
        request.params.spaceId,
        resolveMonth(request.query)
      );
    },

    listShared(
      request: FastifyRequest<{ Params: SpaceParams; Querystring: MonthQuery }>
    ) {
      return entryService.listShared(
        request.user.sub,
        request.params.spaceId,
        resolveMonth(request.query)
      );
    },

    create(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = createEntryBodySchema.parse(request.body);
      return entryService.create(
        request.user.sub,
        request.params.spaceId,
        body
      );
    },

    update(request: FastifyRequest<{ Params: EntryParams }>) {
      const body = updateEntryBodySchema.parse(request.body);
      return entryService.update(
        request.user.sub,
        request.params.entryId,
        body
      );
    },

    async remove(
      request: FastifyRequest<{
        Params: EntryParams;
        Querystring: DeleteQuery;
      }>,
      reply: FastifyReply
    ) {
      await entryService.remove(
        request.user.sub,
        request.params.entryId,
        resolveInstallmentScope(request.query)
      );
      return reply.code(204).send();
    },
  };
}

export type EntryController = ReturnType<typeof createEntryController>;
