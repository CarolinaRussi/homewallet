import type { FastifyInstance } from "fastify";
import type { SpaceController } from "../controllers/space.controller.js";
import { requireUser } from "../plugins/auth.js";

export async function registerSpaceRoutes(
  app: FastifyInstance,
  controller: SpaceController
) {
  app.addHook("preHandler", requireUser);
  app.get("/", (request) => controller.list(request));
  app.post("/", (request) => controller.create(request));
  app.post("/join", (request) => controller.join(request));
  app.patch<{ Params: { id: string } }>("/:id", (request) =>
    controller.update(request)
  );
  app.get<{ Params: { id: string } }>("/:id", (request) =>
    controller.get(request)
  );
  app.get<{ Params: { id: string } }>("/:id/members", (request) =>
    controller.listMembers(request)
  );
  app.post<{ Params: { id: string; userId: string } }>(
    "/:id/members/:userId/promote",
    (request) => controller.promoteMember(request)
  );
  app.post<{ Params: { id: string } }>("/:id/regenerate-join-code", (request) =>
    controller.regenerateJoinCode(request)
  );
  app.post<{ Params: { id: string } }>(
    "/:id/invite-email",
    async (request, reply) => {
      await controller.inviteEmail(request);
      return reply.code(204).send();
    }
  );
  app.post<{ Params: { id: string } }>("/:id/leave", (request) =>
    controller.leave(request)
  );
  app.patch<{ Params: { id: string } }>("/:id/my-limits", (request) =>
    controller.updateMyLimits(request)
  );
  app.get<{ Params: { id: string }; Querystring: { month?: string } }>(
    "/:id/space-month",
    (request) => controller.spaceMonth(request)
  );
}
