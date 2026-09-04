import type { FastifyReply, FastifyRequest } from "fastify";
import {
  googleBodySchema,
  loginBodySchema,
  registerBodySchema,
} from "@homewallet/shared";
import { SESSION_COOKIE, sessionCookieOptions } from "../lib/session-cookie.js";
import type { AuthService } from "../services/auth.service.js";

async function setSession(reply: FastifyReply, userId: string) {
  const token = await reply.jwtSign({ sub: userId });
  reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export function createAuthController(authService: AuthService) {
  return {
    async register(request: FastifyRequest, reply: FastifyReply) {
      const body = registerBodySchema.parse(request.body);
      const user = await authService.register(body);
      await setSession(reply, user.id);
      return { user };
    },

    async login(request: FastifyRequest, reply: FastifyReply) {
      const body = loginBodySchema.parse(request.body);
      const user = await authService.login(body);
      await setSession(reply, user.id);
      return { user };
    },

    async google(request: FastifyRequest, reply: FastifyReply) {
      const body = googleBodySchema.parse(request.body);
      const result = await authService.loginWithGoogle(body);
      await setSession(reply, result.user.id);
      return result;
    },

    async logout(_request: FastifyRequest, reply: FastifyReply) {
      reply.clearCookie(SESSION_COOKIE, { path: "/" });
      return reply.code(204).send();
    },

    async me(request: FastifyRequest) {
      const user = await authService.getById(request.user.sub);
      return { user };
    },

    async exportCsv(request: FastifyRequest, reply: FastifyReply) {
      const csv = await authService.exportEntriesCsv(request.user.sub);
      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header(
          "Content-Disposition",
          'attachment; filename="homewallet-entries.csv"'
        );
      return reply.send(csv);
    },

    async deleteAccount(request: FastifyRequest, reply: FastifyReply) {
      await authService.deleteAccount(request.user.sub);
      reply.clearCookie(SESSION_COOKIE, { path: "/" });
      return reply.code(204).send();
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
