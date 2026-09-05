import type { FastifyInstance } from "fastify";
import type { CategoryController } from "../controllers/category.controller.js";
import type { EntryController } from "../controllers/entry.controller.js";
import type { LeftoverController } from "../controllers/leftover.controller.js";
import type { MePageController } from "../controllers/me-page.controller.js";
import type { OverviewController } from "../controllers/overview.controller.js";
import type { RecurringController } from "../controllers/recurring.controller.js";
import type { ReservePotController } from "../controllers/reserve-pot.controller.js";
import { requireUser } from "../plugins/auth.js";

export async function registerLedgerRoutes(
  app: FastifyInstance,
  categoryController: CategoryController,
  entryController: EntryController,
  leftoverController: LeftoverController,
  mePageController: MePageController,
  recurringController: RecurringController,
  reservePotController: ReservePotController,
  overviewController: OverviewController
) {
  app.addHook("preHandler", requireUser);

  app.get<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/categories",
    (request) => categoryController.list(request)
  );
  app.post<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/categories",
    (request) => categoryController.create(request)
  );
  app.patch<{ Params: { spaceId: string; categoryId: string } }>(
    "/spaces/:spaceId/categories/:categoryId",
    (request) => categoryController.update(request)
  );

  app.get<{ Params: { spaceId: string }; Querystring: { month?: string } }>(
    "/spaces/:spaceId/entries",
    (request) => entryController.listMine(request)
  );
  app.get<{ Params: { spaceId: string }; Querystring: { month?: string } }>(
    "/spaces/:spaceId/entries/shared",
    (request) => entryController.listShared(request)
  );
  app.post<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/entries",
    (request) => entryController.create(request)
  );
  app.patch<{ Params: { entryId: string } }>("/entries/:entryId", (request) =>
    entryController.update(request)
  );
  app.post<{ Params: { entryId: string } }>(
    "/entries/:entryId/card-lines",
    (request) => entryController.addCardLine(request)
  );
  app.patch<{ Params: { entryId: string; lineId: string } }>(
    "/entries/:entryId/card-lines/:lineId",
    (request) => entryController.updateCardLine(request)
  );
  app.delete<{
    Params: { entryId: string; lineId: string };
    Querystring: { scope?: string };
  }>("/entries/:entryId/card-lines/:lineId", (request, reply) =>
    entryController.removeCardLine(request, reply)
  );
  app.delete<{
    Params: { entryId: string };
    Querystring: { installmentScope?: string };
  }>("/entries/:entryId", (request, reply) =>
    entryController.remove(request, reply)
  );

  app.get<{ Params: { spaceId: string }; Querystring: { month?: string } }>(
    "/spaces/:spaceId/me-page",
    (request) => mePageController.load(request)
  );
  app.get<{ Params: { spaceId: string }; Querystring: { month?: string } }>(
    "/spaces/:spaceId/month-summary",
    (request) => leftoverController.monthSummary(request)
  );
  app.get<{
    Params: { spaceId: string };
    Querystring: Record<string, string | undefined>;
  }>("/spaces/:spaceId/overview-series", (request) =>
    overviewController.series(request)
  );
  app.get<{
    Params: { spaceId: string };
    Querystring: Record<string, string | undefined>;
  }>("/spaces/:spaceId/overview-breakdown", (request) =>
    overviewController.breakdown(request)
  );
  app.post<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/reserve-movements",
    (request) => leftoverController.createMovement(request)
  );
  app.delete<{ Params: { movementId: string } }>(
    "/reserve-movements/:movementId",
    (request, reply) => leftoverController.removeMovement(request, reply)
  );

  app.get<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/reserve-pots",
    (request) => reservePotController.list(request)
  );
  app.post<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/reserve-pots",
    (request) => reservePotController.create(request)
  );
  app.patch<{ Params: { potId: string } }>("/reserve-pots/:potId", (request) =>
    reservePotController.update(request)
  );
  app.delete<{ Params: { potId: string } }>(
    "/reserve-pots/:potId",
    (request, reply) => reservePotController.remove(request, reply)
  );

  app.post<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/leftover-seeds",
    (request) => leftoverController.createLeftoverSeed(request)
  );
  app.delete<{ Params: { seedId: string } }>(
    "/leftover-seeds/:seedId",
    (request, reply) => leftoverController.removeLeftoverSeed(request, reply)
  );

  app.get<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/recurring-rules",
    (request) => recurringController.listRules(request)
  );
  app.post<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/recurring-rules",
    (request) => recurringController.createRule(request)
  );
  app.delete<{ Params: { ruleId: string } }>(
    "/recurring-rules/:ruleId",
    (request, reply) => recurringController.removeRule(request, reply)
  );

  app.get<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/installment-plans",
    (request) => recurringController.listPlans(request)
  );
  app.post<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/installment-plans",
    (request) => recurringController.createPlan(request)
  );
  app.delete<{ Params: { planId: string } }>(
    "/installment-plans/:planId",
    (request, reply) => recurringController.removePlan(request, reply)
  );
}
