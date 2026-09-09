import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; sv: number };
    user: { sub: string; sv: number };
  }
}
