FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma

RUN npm ci

COPY tsconfig.json ./
COPY scripts ./scripts
COPY src ./src

RUN chmod +x ./scripts/start-production.sh

RUN npm run typecheck

ENV NODE_ENV=production

CMD ["./scripts/start-production.sh"]
