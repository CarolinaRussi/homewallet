import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { User } from "../db/entities/user.entity.js";
import { HttpError } from "../lib/http-error.js";
import { SESSION_COOKIE } from "../lib/session-cookie.js";
import { assertSessionVersion } from "../lib/session-version.js";

export async function requireUser(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch {
    throw new HttpError(401, "Unauthorized");
  }

  const user = await User.findOneBy({ id: request.user.sub });
  if (!user) {
    throw new HttpError(401, "Unauthorized");
  }
  assertSessionVersion(request.user.sv, user.sessionVersion);
}

export async function registerAuth(app: FastifyInstance, jwtSecret: string) {
  await app.register(cookie);
  await app.register(jwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: "14d",
    },
    cookie: {
      cookieName: SESSION_COOKIE,
      signed: false,
    },
  });
}
