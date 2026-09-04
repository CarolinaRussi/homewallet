function readRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env ${name}`);
  }
  return value;
}

export function loadConfig() {
  return {
    databaseUrl: readRequired("DATABASE_URL"),
    jwtSecret: readRequired("JWT_SECRET"),
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() ?? "",
    resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
    resendFrom: process.env.RESEND_FROM?.trim() ?? "",
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? "0.0.0.0",
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
