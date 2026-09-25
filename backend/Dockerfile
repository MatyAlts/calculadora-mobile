# syntax=docker/dockerfile:1
FROM node:24.18.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig*.json eslint.config.js ./
COPY src ./src
COPY test ./test
RUN npm run lint && npm run typecheck && npm test && npm run build

FROM build AS test
CMD ["npm", "test"]

FROM node:24.18.0-bookworm-slim AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:24.18.0-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health', {signal: AbortSignal.timeout(2000)}).then(r => {if (!r.ok) process.exit(1)}).catch(() => process.exit(1))"
CMD ["node", "dist/server.js"]
