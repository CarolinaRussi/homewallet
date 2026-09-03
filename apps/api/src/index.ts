import Fastify from "fastify";
import { APP_NAME } from "@homewallet/shared";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

const app = Fastify({ logger: true });

app.get("/health", async () => ({
  status: "ok",
  app: APP_NAME,
}));

await app.listen({ port, host });
