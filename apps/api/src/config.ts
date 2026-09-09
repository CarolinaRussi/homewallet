function readRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

export function loadConfig() {
  const jwtSecret = readRequired("JWT_SECRET");
  if (isProduction && jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production");
  }

  const webOriginRaw = process.env.WEB_ORIGIN?.trim();
  if (isProduction && !webOriginRaw) {
    throw new Error("Missing env WEB_ORIGIN");
  }
  const webOrigin = webOriginRaw || "http://localhost:5173";

  return {
    databaseUrl: readRequired("DATABASE_URL"),
    jwtSecret,
    webOrigin,
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
    resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
    resendFrom: process.env.RESEND_FROM?.trim() ?? "",
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? "0.0.0.0",
    isProduction,
    /** Set RUN_MIGRATIONS=false to skip boot migrations (e.g. external migrate job). */
    runMigrations: process.env.RUN_MIGRATIONS !== "false",
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
