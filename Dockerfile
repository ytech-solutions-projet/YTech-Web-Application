FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

RUN apk upgrade --no-cache

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM node:20-alpine AS backend-deps

WORKDIR /app/backend

RUN apk upgrade --no-cache

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev


FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=5001
ENV HOST=0.0.0.0

WORKDIR /app

RUN apk upgrade --no-cache \
  && addgroup -S ytech \
  && adduser -S -G ytech ytech

COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --chown=ytech:ytech backend ./backend
COPY --from=frontend-builder --chown=ytech:ytech /app/frontend/build ./frontend/build

WORKDIR /app/backend

USER ytech

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5001/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"

CMD ["node", "server.js"]
