FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
COPY scripts/install-mira.mjs scripts/mira-runtime.mjs ./scripts/
COPY mira/requirements.lock mira/requirements-test.lock ./mira/
RUN npm ci --workspaces=false

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
RUN node scripts/install-mira.mjs --production && chown -R node:node /app/.runtime
USER node
EXPOSE 3000
CMD ["node", "scripts/run-system.mjs", "standalone"]
