import type { FastifyInstance } from "fastify";
import type { AuthController } from "../controllers/auth.controller.js";
import { requireUser } from "../plugins/auth.js";

const authAbuseLimit = {
  config: {
    rateLimit: {
      max: 20,
      timeWindow: "1 minute",
    },
  },
};

export async function registerAuthRoutes(
  app: FastifyInstance,
  controller: AuthController
) {
  app.post("/register", authAbuseLimit, (request, reply) =>
    controller.register(request, reply)
  );
  app.post("/login", authAbuseLimit, (request, reply) =>
    controller.login(request, reply)
  );
  app.post("/google", authAbuseLimit, (request, reply) =>
    controller.google(request, reply)
  );
  app.post("/forgot-password", authAbuseLimit, (request, reply) =>
    controller.forgotPassword(request, reply)
  );
  app.post("/reset-password", authAbuseLimit, (request, reply) =>
    controller.resetPassword(request, reply)
  );
  app.post("/verify-email", authAbuseLimit, (request, reply) =>
    controller.verifyEmail(request, reply)
  );
  app.post("/logout", (request, reply) => controller.logout(request, reply));
  app.get("/me", { preHandler: requireUser }, (request) =>
    controller.me(request)
  );
  app.post("/link-google", { preHandler: requireUser }, (request, reply) =>
    controller.linkGoogle(request, reply)
  );
  app.post(
    "/resend-verify-email",
    { preHandler: requireUser },
    (request, reply) => controller.resendVerifyEmail(request, reply)
  );
  app.get("/me/export.csv", { preHandler: requireUser }, (request, reply) =>
    controller.exportCsv(request, reply)
  );
  app.delete("/me", { preHandler: requireUser }, (request, reply) =>
    controller.deleteAccount(request, reply)
  );
}
