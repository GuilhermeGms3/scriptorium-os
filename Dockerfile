# syntax=docker/dockerfile:1

FROM node:22.20.0-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22.20.0-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

WORKDIR /app

RUN groupadd --system --gid 1001 scriptorium \
    && useradd --system --uid 1001 --gid scriptorium --no-create-home scriptorium

COPY --from=builder --chown=scriptorium:scriptorium /app/.output ./.output

USER scriptorium

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", ".output/server/index.mjs"]
