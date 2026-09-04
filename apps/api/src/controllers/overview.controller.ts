import type { FastifyRequest } from "fastify";
import {
  monthQuerySchema,
  overviewSeriesQuerySchema,
} from "@homewallet/shared";
import type { OverviewService } from "../services/overview.service.js";

type SpaceParams = { spaceId: string };

function resolveEndMonth(endMonth: string | undefined) {
  if (endMonth) {
    return monthQuerySchema.parse(endMonth);
  }
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function createOverviewController(overviewService: OverviewService) {
  return {
    series(
      request: FastifyRequest<{
        Params: SpaceParams;
        Querystring: Record<string, string | undefined>;
      }>
    ) {
      const query = overviewSeriesQuerySchema.parse(request.query);
      return overviewService.getSeries(
        request.user.sub,
        request.params.spaceId,
        {
          range: query.range,
          scope: query.scope,
          memberUserId: query.memberUserId,
          endMonth: resolveEndMonth(query.endMonth),
        }
      );
    },
  };
}

export type OverviewController = ReturnType<typeof createOverviewController>;
