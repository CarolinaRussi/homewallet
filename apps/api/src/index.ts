import "reflect-metadata";
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import { APP_NAME } from "@homewallet/shared";
import Fastify from "fastify";
import { ZodError } from "zod";
import { loadConfig } from "./config.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { createSpaceController } from "./controllers/space.controller.js";
import { createDataSource } from "./db/data-source.js";
import { Membership } from "./db/entities/membership.entity.js";
import { Space } from "./db/entities/space.entity.js";
import { User } from "./db/entities/user.entity.js";
import { HttpError } from "./lib/http-error.js";
import { registerAuth } from "./plugins/auth.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerSpaceRoutes } from "./routes/space.routes.js";
import { createAuthService } from "./services/auth.service.js";
import { createSpaceService } from "./services/space.service.js";

loadEnv({
  path: join(dirname(fileURLToPath(import.meta.url)), "../.env"),
  override: true,
});

const config = loadConfig();
const dataSource = createDataSource(config.databaseUrl);
await dataSource.initialize();
await dataSource.runMigrations();
User.useDataSource(dataSource);
Space.useDataSource(dataSource);
Membership.useDataSource(dataSource);

const spaceService = createSpaceService(dataSource);
const authService = createAuthService(dataSource, spaceService, config);

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.webOrigin,
  credentials: true,
});
await registerAuth(app, config.jwtSecret);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof HttpError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  if (error instanceof ZodError) {
    return reply.code(400).send({ error: "Invalid request" });
  }
  app.log.error(error);
  return reply.code(500).send({ error: "Internal server error" });
});

app.get("/health", async () => ({
  status: "ok",
  app: APP_NAME,
}));

await app.register(
  async (scoped) =>
    registerAuthRoutes(scoped, createAuthController(authService)),
  { prefix: "/auth" }
);
await app.register(
  async (scoped) =>
    registerSpaceRoutes(scoped, createSpaceController(spaceService)),
  { prefix: "/spaces" }
);

await app.listen({ port: config.port, host: config.host });
app.log.info(
  config.googleClientId
    ? "Google sign-in enabled"
    : "Google sign-in disabled (GOOGLE_CLIENT_ID empty)"
);
