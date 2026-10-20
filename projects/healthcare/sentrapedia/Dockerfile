FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json .npmrc ./
COPY scripts/install-aadi.mjs scripts/aadi-runtime.mjs scripts/aadi-profile.json scripts/theoracle-model.mjs scripts/install-theoracle-model.mjs ./scripts/
COPY aadi/requirements.lock aadi/requirements-test.lock ./aadi/
# postinstall ends with the site's install:check, which reads these files.
COPY apps/site/package.json ./apps/site/
COPY apps/site/tools/install-check.mjs ./apps/site/tools/
COPY apps/site/source/index.html ./apps/site/source/
COPY apps/site/static/ ./apps/site/static/
COPY apps/site/reference/design-integrity.json ./apps/site/reference/
RUN npm ci --workspaces=false

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
# Layers for a small update (2026-10-20): the large, rarely changed parts leave the standalone tree and get their own
# runtime layers, so a code change ships only the last layer. The model comes from the dependencies stage instead.
# The public code tree has no index (and may have no model), so an absent folder becomes an empty one.
RUN mkdir -p /stage/theoracle && cd .next/standalone && rm -rf theoracle/model \
 && for dir in theoracle/index node_modules; do if [ -d "$dir" ]; then mv "$dir" "/stage/$dir"; else mkdir -p "/stage/$dir"; fi; done

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Single-user and local only: the workspace has no login, so anyone who reaches the port can spend the Gemini key
# (capped by the 5 USD daily budget). The server listens on all interfaces inside the container; publish it on
# loopback only, never on a public port:
#   docker run -p 127.0.0.1:3000:3000 --env GEMINI_API_KEY <image>
ENV HOSTNAME=0.0.0.0
# Stable first: model (changes with package-lock), index (with the database), node_modules and the AADI venv
# (with the locks), then the app.
COPY --from=dependencies --chown=node:node /app/theoracle/model ./theoracle/model
COPY --from=builder --chown=node:node /stage/theoracle/index ./theoracle/index
COPY --from=builder --chown=node:node /stage/node_modules ./node_modules
COPY scripts/install-aadi.mjs scripts/aadi-runtime.mjs scripts/aadi-profile.json ./scripts/
COPY aadi/requirements.lock ./aadi/
RUN node scripts/install-aadi.mjs --production && chown -R node:node /app/.runtime
COPY --from=builder --chown=node:node /app/.next/standalone ./
USER node
EXPOSE 3000
CMD ["node", "scripts/run-system.mjs", "standalone"]
