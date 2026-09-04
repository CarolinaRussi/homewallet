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
import { createCategoryController } from "./controllers/category.controller.js";
import { createEntryController } from "./controllers/entry.controller.js";
import { createLeftoverController } from "./controllers/leftover.controller.js";
import { createRecurringController } from "./controllers/recurring.controller.js";
import { createSpaceController } from "./controllers/space.controller.js";
import { createDataSource } from "./db/data-source.js";
import { Category } from "./db/entities/category.entity.js";
import { Entry } from "./db/entities/entry.entity.js";
import { InstallmentPlan } from "./db/entities/installment-plan.entity.js";
import { LeftoverSeed } from "./db/entities/leftover-seed.entity.js";
import { Membership } from "./db/entities/membership.entity.js";
import { RecurrenceSkip } from "./db/entities/recurrence-skip.entity.js";
import { RecurringRule } from "./db/entities/recurring-rule.entity.js";
import { ReserveMovement } from "./db/entities/reserve-movement.entity.js";
import { Space } from "./db/entities/space.entity.js";
import { User } from "./db/entities/user.entity.js";
import { HttpError } from "./lib/http-error.js";
import { registerAuth } from "./plugins/auth.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerLedgerRoutes } from "./routes/ledger.routes.js";
import { registerSpaceRoutes } from "./routes/space.routes.js";
import { createAuthService } from "./services/auth.service.js";
import { createCategoryService } from "./services/category.service.js";
import { createEntryService } from "./services/entry.service.js";
import { createLeftoverService } from "./services/leftover.service.js";
import { createRecurringService } from "./services/recurring.service.js";
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
Category.useDataSource(dataSource);
Entry.useDataSource(dataSource);
ReserveMovement.useDataSource(dataSource);
RecurringRule.useDataSource(dataSource);
InstallmentPlan.useDataSource(dataSource);
RecurrenceSkip.useDataSource(dataSource);
LeftoverSeed.useDataSource(dataSource);

const spaceService = createSpaceService(dataSource);
const authService = createAuthService(dataSource, spaceService, config);
const categoryService = createCategoryService(dataSource);
const recurringService = createRecurringService(dataSource);
const entryService = createEntryService(dataSource, recurringService);
const leftoverService = createLeftoverService(dataSource, recurringService);

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
    const firstIssue = error.issues[0];
    return reply.code(400).send({
      error: firstIssue?.message ?? "Invalid request",
    });
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
await registerLedgerRoutes(
  app,
  createCategoryController(categoryService),
  createEntryController(entryService),
  createLeftoverController(leftoverService),
  createRecurringController(recurringService)
);

await app.listen({ port: config.port, host: config.host });
app.log.info(
  config.googleClientId
    ? "Google sign-in enabled"
    : "Google sign-in disabled (GOOGLE_CLIENT_ID empty)"
);
