import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { HttpError } from "../lib/http-error.js";
import { SESSION_COOKIE } from "../lib/session-cookie.js";

export async function requireUser(request: FastifyRequest) {
  try {
    await request.jwtVerify();
  } catch {
    throw new HttpError(401, "Unauthorized");
  }
}

export async function registerAuth(app: FastifyInstance, jwtSecret: string) {
  await app.register(cookie);
  await app.register(jwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: SESSION_COOKIE,
      signed: false,
    },
  });
}
