# ---- Build aşaması ----
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Production aşaması ----
FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production

# onnxruntime-node multilingual-e5-large modelini çalıştırmak için libgomp gerektiriyor
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY migrations ./migrations

EXPOSE 3000
CMD ["node", "dist/index.js"]
