# Multi-stage build for Cup & Co API
# Deploy to: Render, Fly.io, Railway, or any Docker host

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /app
WORKDIR /app
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cup-and-co/api build

FROM base
COPY --from=build /app /app
WORKDIR /app
ENV NODE_ENV=production
EXPOSE 4000
CMD ["pnpm", "--filter", "@cup-and-co/api", "start"]
