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
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? "0.0.0.0",
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
