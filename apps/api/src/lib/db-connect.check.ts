import { config as loadEnv } from "dotenv";
import { join } from "node:path";
import { createDataSource } from "../db/data-source.js";

loadEnv({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("FAIL: DATABASE_URL missing in apps/api/.env");
  process.exit(1);
}

const hostHint = databaseUrl.includes("neon.tech")
  ? "neon"
  : databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
    ? "local"
    : "other";

const dataSource = createDataSource(databaseUrl);

try {
  await dataSource.initialize();
  await dataSource.runMigrations();
  const rows = await dataSource.query(
    "select current_database() as db, now() as now"
  );
  const tables = await dataSource.query(
    "select tablename from pg_tables where schemaname = 'public' order by tablename"
  );
  console.log(
    `OK connected (${hostHint}) db=${rows[0].db} tables=${tables
      .map((row: { tablename: string }) => row.tablename)
      .join(",")}`
  );
} catch (error) {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
}
