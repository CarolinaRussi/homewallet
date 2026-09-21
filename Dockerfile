# HomeWallet API — Cloud Run
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
# Skip lifecycle scripts (root `prepare` → husky) in the image
RUN pnpm install --frozen-lockfile --filter @homewallet/api... --ignore-scripts

FROM base AS build
COPY --from=deps /app /app
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
RUN pnpm --filter @homewallet/shared build

# Run with tsx (same as local `start`) — compiled ESM + TypeORM decorators
# hits circular init errors under plain `node`.
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @homewallet/api... --prod --ignore-scripts
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./
COPY apps/api/src ./apps/api/src
WORKDIR /app/apps/api
EXPOSE 8080
USER node
CMD ["node", "--import", "tsx", "src/index.ts"]
