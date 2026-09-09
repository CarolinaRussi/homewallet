import type { FastifyReply, FastifyRequest } from "fastify";
import {
  forgotPasswordBodySchema,
  googleBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
} from "@homewallet/shared";
import { User } from "../db/entities/user.entity.js";
import { HttpError } from "../lib/http-error.js";
import { SESSION_COOKIE, sessionCookieOptions } from "../lib/session-cookie.js";
import type { AuthService } from "../services/auth.service.js";

async function setSession(reply: FastifyReply, userId: string) {
  const user = await User.findOneBy({ id: userId });
  if (!user) {
    throw new HttpError(401, "Unauthorized");
  }
  const token = await reply.jwtSign({
    sub: userId,
    sv: user.sessionVersion,
  });
  reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export function createAuthController(authService: AuthService) {
  return {
    async register(request: FastifyRequest, reply: FastifyReply) {
      const body = registerBodySchema.parse(request.body);
      const result = await authService.register(body);
      await setSession(reply, result.user.id);
      return result;
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

    async linkGoogle(request: FastifyRequest, reply: FastifyReply) {
      const body = googleBodySchema.parse(request.body);
      const user = await authService.linkGoogle(request.user.sub, body);
      await setSession(reply, user.id);
      return { user };
    },

    async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
      const body = forgotPasswordBodySchema.parse(request.body);
      await authService.forgotPassword(body);
      return reply.code(204).send();
    },

    async resetPassword(request: FastifyRequest, reply: FastifyReply) {
      const body = resetPasswordBodySchema.parse(request.body);
      await authService.resetPassword(body);
      return reply.code(204).send();
    },

    async logout(_request: FastifyRequest, reply: FastifyReply) {
      reply.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      return reply.code(204).send();
    },

    async me(request: FastifyRequest) {
      const user = await authService.getById(request.user.sub);
      return { user };
    },

    async resendVerifyEmail(request: FastifyRequest, reply: FastifyReply) {
      await authService.resendVerifyEmail(request.user.sub);
      return reply.code(204).send();
    },

    async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
      const body = verifyEmailBodySchema.parse(request.body);
      await authService.verifyEmail(body.token);
      return reply.code(204).send();
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
      reply.clearCookie(SESSION_COOKIE, sessionCookieOptions());
      return reply.code(204).send();
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
