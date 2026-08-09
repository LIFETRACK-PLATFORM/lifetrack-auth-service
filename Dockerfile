# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG DATABASE_URL=postgresql://ci:ci@localhost:5432/ci
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm exec prisma generate
RUN pnpm run build

# Stage 2: Solo dependencias de producción
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Stage 3: Runtime final (imagen pequeña)
FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
USER nestjs
CMD ["node", "dist/src/main"]
