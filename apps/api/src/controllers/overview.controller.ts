import type { FastifyRequest } from "fastify";
import {
  monthQuerySchema,
  overviewBreakdownQuerySchema,
  overviewSeriesQuerySchema,
} from "@homewallet/shared";
import type { OverviewService } from "../services/overview.service.js";

type SpaceParams = { spaceId: string };

function resolveMonth(month: string | undefined) {
  if (month) {
    return monthQuerySchema.parse(month);
  }
  const now = new Date();
  const monthPart = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${monthPart}`;
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
          endMonth: resolveMonth(query.endMonth),
        }
      );
    },

    breakdown(
      request: FastifyRequest<{
        Params: SpaceParams;
        Querystring: Record<string, string | undefined>;
      }>
    ) {
      const query = overviewBreakdownQuerySchema.parse(request.query);
      return overviewService.getBreakdown(
        request.user.sub,
        request.params.spaceId,
        {
          month: resolveMonth(query.month),
          scope: query.scope,
          memberUserId: query.memberUserId,
        }
      );
    },
  };
}

export type OverviewController = ReturnType<typeof createOverviewController>;
