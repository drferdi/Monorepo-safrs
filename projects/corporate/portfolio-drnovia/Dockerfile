FROM node:24-alpine3.22@sha256:191c9f0080fcbbc6547a85dc0ff7988072214a355aabdc1d2ec55a7dae5eea8a AS build
WORKDIR /workspace
COPY . .
RUN ["node", "scripts/install.mjs"]
RUN ["node", "scripts/build.mjs"]

FROM node:24-alpine3.22@sha256:191c9f0080fcbbc6547a85dc0ff7988072214a355aabdc1d2ec55a7dae5eea8a AS runtime
WORKDIR /app
COPY --from=build --chown=node:node /workspace/dist/ ./
ENV HOST=0.0.0.0
ENV PORT=4173
ENV NODE_ENV=production
EXPOSE 4173
USER node
CMD ["node", "server.js"]
