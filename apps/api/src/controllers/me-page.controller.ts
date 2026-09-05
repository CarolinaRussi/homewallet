import type { FastifyRequest } from "fastify";
import { monthQuerySchema } from "@homewallet/shared";
import type { MePageService } from "../services/me-page.service.js";

type SpaceParams = { spaceId: string };
type MonthQuery = { month?: string };

function resolveMonth(query: MonthQuery) {
  if (query.month) {
    return monthQuerySchema.parse(query.month);
  }
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function createMePageController(mePageService: MePageService) {
  return {
    load(
      request: FastifyRequest<{ Params: SpaceParams; Querystring: MonthQuery }>
    ) {
      return mePageService.load(
        request.user.sub,
        request.params.spaceId,
        resolveMonth(request.query)
      );
    },
  };
}

export type MePageController = ReturnType<typeof createMePageController>;
