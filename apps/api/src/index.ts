import "reflect-metadata";
import { config as loadEnv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { APP_NAME } from "@homewallet/shared";
import Fastify from "fastify";
import { ZodError } from "zod";
import { loadConfig } from "./config.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { createCategoryController } from "./controllers/category.controller.js";
import { createEntryController } from "./controllers/entry.controller.js";
import { createLeftoverController } from "./controllers/leftover.controller.js";
import { createMePageController } from "./controllers/me-page.controller.js";
import { createOverviewController } from "./controllers/overview.controller.js";
import { createRecurringController } from "./controllers/recurring.controller.js";
import { createReservePotController } from "./controllers/reserve-pot.controller.js";
import { createSpaceController } from "./controllers/space.controller.js";
import { createDataSource } from "./db/data-source.js";
import { Category } from "./db/entities/category.entity.js";
import { Entry } from "./db/entities/entry.entity.js";
import { EmailVerifyToken } from "./db/entities/email-verify-token.entity.js";
import { InstallmentPlan } from "./db/entities/installment-plan.entity.js";
import { LeftoverSeed } from "./db/entities/leftover-seed.entity.js";
import { MemberMonthSnapshot } from "./db/entities/member-month-snapshot.entity.js";
import { Membership } from "./db/entities/membership.entity.js";
import { PasswordResetToken } from "./db/entities/password-reset-token.entity.js";
import { RecurrenceSkip } from "./db/entities/recurrence-skip.entity.js";
import { RecurringRule } from "./db/entities/recurring-rule.entity.js";
import { ReserveMovement } from "./db/entities/reserve-movement.entity.js";
import { ReservePot } from "./db/entities/reserve-pot.entity.js";
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
import { createMePageService } from "./services/me-page.service.js";
import { createMonthSnapshotService } from "./services/month-snapshot.service.js";
import { createMailService } from "./services/mail.service.js";
import { createOverviewService } from "./services/overview.service.js";
import { createRecurringService } from "./services/recurring.service.js";
import { createReservePotService } from "./services/reserve-pot.service.js";
import { createSpaceService } from "./services/space.service.js";

loadEnv({
  path: join(dirname(fileURLToPath(import.meta.url)), "../.env"),
  override: true,
});

const config = loadConfig();
const dataSource = createDataSource(config.databaseUrl);
await dataSource.initialize();
if (config.runMigrations) {
  await dataSource.runMigrations();
}
User.useDataSource(dataSource);
Space.useDataSource(dataSource);
Membership.useDataSource(dataSource);
Category.useDataSource(dataSource);
Entry.useDataSource(dataSource);
ReserveMovement.useDataSource(dataSource);
ReservePot.useDataSource(dataSource);
RecurringRule.useDataSource(dataSource);
InstallmentPlan.useDataSource(dataSource);
RecurrenceSkip.useDataSource(dataSource);
LeftoverSeed.useDataSource(dataSource);
PasswordResetToken.useDataSource(dataSource);
EmailVerifyToken.useDataSource(dataSource);
MemberMonthSnapshot.useDataSource(dataSource);

const mailService = createMailService(config);
const spaceService = createSpaceService(
  dataSource,
  mailService,
  config.webOrigin
);
const authService = createAuthService(
  dataSource,
  spaceService,
  config,
  mailService
);
const categoryService = createCategoryService(dataSource);
const reservePotService = createReservePotService(dataSource);
const monthSnapshotService = createMonthSnapshotService(
  dataSource,
  reservePotService
);
const recurringService = createRecurringService(
  dataSource,
  monthSnapshotService
);
const entryService = createEntryService(
  dataSource,
  recurringService,
  reservePotService,
  monthSnapshotService
);
const leftoverService = createLeftoverService(
  dataSource,
  recurringService,
  reservePotService,
  monthSnapshotService
);
const mePageService = createMePageService(
  entryService,
  leftoverService,
  recurringService,
  monthSnapshotService
);
const overviewService = createOverviewService(dataSource, recurringService);

const app = Fastify({ logger: true, trustProxy: true });

await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});
await app.register(rateLimit, {
  global: false,
});
await app.register(cors, {
  origin: config.webOrigin,
  credentials: true,
});
await registerAuth(app, config.jwtSecret);

app.setErrorHandler((error, _request, reply) => {
  if (error instanceof HttpError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  if (isZodError(error)) {
    const firstIssue = error.issues[0];
    return reply.code(400).send({
      error: firstIssue?.message ?? "Invalid request",
    });
  }
  if (isClientFastifyError(error)) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  app.log.error(error);
  return reply.code(500).send({ error: "Internal server error" });
});

function isZodError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "ZodError" &&
      "issues" in error &&
      Array.isArray((error as { issues: unknown }).issues))
  );
}

function isClientFastifyError(
  error: unknown
): error is Error & { statusCode: number } {
  if (!(error instanceof Error)) {
    return false;
  }
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return (
    typeof statusCode === "number" && statusCode >= 400 && statusCode < 500
  );
}

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
await app.register(async (scoped) =>
  registerLedgerRoutes(
    scoped,
    createCategoryController(categoryService),
    createEntryController(entryService),
    createLeftoverController(leftoverService),
    createMePageController(mePageService),
    createRecurringController(recurringService),
    createReservePotController(reservePotService),
    createOverviewController(overviewService)
  )
);

await app.listen({ port: config.port, host: config.host });
app.log.info(
  config.googleClientId
    ? "Google sign-in enabled"
    : "Google sign-in disabled (GOOGLE_CLIENT_ID empty)"
);
