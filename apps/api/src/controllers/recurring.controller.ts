import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createInstallmentPlanBodySchema,
  createRecurringRuleBodySchema,
} from "@homewallet/shared";
import type { RecurringService } from "../services/recurring.service.js";

type SpaceParams = { spaceId: string };
type RuleParams = { ruleId: string };
type PlanParams = { planId: string };

export function createRecurringController(recurringService: RecurringService) {
  return {
    listRules(request: FastifyRequest<{ Params: SpaceParams }>) {
      return recurringService.listRules(
        request.user.sub,
        request.params.spaceId
      );
    },

    createRule(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = createRecurringRuleBodySchema.parse(request.body);
      return recurringService.createRule(
        request.user.sub,
        request.params.spaceId,
        body
      );
    },

    async removeRule(
      request: FastifyRequest<{ Params: RuleParams }>,
      reply: FastifyReply
    ) {
      await recurringService.removeRule(
        request.user.sub,
        request.params.ruleId
      );
      return reply.code(204).send();
    },

    listPlans(request: FastifyRequest<{ Params: SpaceParams }>) {
      return recurringService.listPlans(
        request.user.sub,
        request.params.spaceId
      );
    },

    createPlan(request: FastifyRequest<{ Params: SpaceParams }>) {
      const body = createInstallmentPlanBodySchema.parse(request.body);
      return recurringService.createPlan(
        request.user.sub,
        request.params.spaceId,
        body
      );
    },

    async removePlan(
      request: FastifyRequest<{ Params: PlanParams }>,
      reply: FastifyReply
    ) {
      await recurringService.removePlan(
        request.user.sub,
        request.params.planId
      );
      return reply.code(204).send();
    },
  };
}

export type RecurringController = ReturnType<typeof createRecurringController>;
