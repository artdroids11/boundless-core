FROM node:24-bookworm-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:24-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY scripts/start-production.sh ./scripts/start-production.sh
RUN chmod +x ./scripts/start-production.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["./scripts/start-production.sh"]
