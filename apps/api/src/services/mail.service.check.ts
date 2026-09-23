import type { AppConfig } from "../config.js";
import { createMailService } from "./mail.service.js";

function config(partial: Partial<AppConfig>): AppConfig {
  return {
    databaseUrl: "postgres://local",
    jwtSecret: "x".repeat(32),
    webOrigin: "http://localhost:5173",
    googleClientId: "",
    resendApiKey: "",
    resendFrom: "",
    port: 3001,
    host: "0.0.0.0",
    isProduction: false,
    runMigrations: false,
    ...partial,
  };
}

const prodUnconfigured = createMailService(config({ isProduction: true }));

try {
  await prodUnconfigured.send({
    to: "user@example.com",
    subject: "Reset your password",
    html: "<p>hi</p>",
    debugLink: "http://localhost:5173/reset-password?token=test",
  });
} catch (error) {
  throw new Error(
    `mail check: production without Resend must not throw (forgot-password 500). got: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

const localUnconfigured = createMailService(config({ isProduction: false }));
await localUnconfigured.send({
  to: "user@example.com",
  subject: "Reset your password",
  html: "<p>hi</p>",
});

console.log("mail check ok");
