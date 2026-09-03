import type { FastifyInstance } from "fastify";
import type { CategoryController } from "../controllers/category.controller.js";
import type { EntryController } from "../controllers/entry.controller.js";
import type { LeftoverController } from "../controllers/leftover.controller.js";
import { requireUser } from "../plugins/auth.js";

export async function registerLedgerRoutes(
  app: FastifyInstance,
  categoryController: CategoryController,
  entryController: EntryController,
  leftoverController: LeftoverController
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
  app.delete<{ Params: { entryId: string } }>(
    "/entries/:entryId",
    (request, reply) => entryController.remove(request, reply)
  );

  app.get<{ Params: { spaceId: string }; Querystring: { month?: string } }>(
    "/spaces/:spaceId/month-summary",
    (request) => leftoverController.monthSummary(request)
  );
  app.post<{ Params: { spaceId: string } }>(
    "/spaces/:spaceId/reserve-movements",
    (request) => leftoverController.createMovement(request)
  );
  app.delete<{ Params: { movementId: string } }>(
    "/reserve-movements/:movementId",
    (request, reply) => leftoverController.removeMovement(request, reply)
  );
}
