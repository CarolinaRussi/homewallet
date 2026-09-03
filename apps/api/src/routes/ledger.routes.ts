import type { FastifyInstance } from "fastify";
import type { CategoryController } from "../controllers/category.controller.js";
import type { EntryController } from "../controllers/entry.controller.js";
import { requireUser } from "../plugins/auth.js";

export async function registerLedgerRoutes(
  app: FastifyInstance,
  categoryController: CategoryController,
  entryController: EntryController
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
}
