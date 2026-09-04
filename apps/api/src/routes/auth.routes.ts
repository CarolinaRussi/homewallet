import type { FastifyInstance } from "fastify";
import type { AuthController } from "../controllers/auth.controller.js";
import { requireUser } from "../plugins/auth.js";

export async function registerAuthRoutes(
  app: FastifyInstance,
  controller: AuthController
) {
  app.post("/register", (request, reply) =>
    controller.register(request, reply)
  );
  app.post("/login", (request, reply) => controller.login(request, reply));
  app.post("/google", (request, reply) => controller.google(request, reply));
  app.post("/logout", (request, reply) => controller.logout(request, reply));
  app.get("/me", { preHandler: requireUser }, (request) =>
    controller.me(request)
  );
  app.get("/me/export.csv", { preHandler: requireUser }, (request, reply) =>
    controller.exportCsv(request, reply)
  );
  app.delete("/me", { preHandler: requireUser }, (request, reply) =>
    controller.deleteAccount(request, reply)
  );
}
