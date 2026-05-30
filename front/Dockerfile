FROM node:25-slim AS builder
    WORKDIR /app
    COPY package.json .
    RUN npm install
    COPY . .
    RUN npm run build

FROM node:25-slim AS runner
    WORKDIR /app
    COPY --from=builder /app/.output .

    CMD ["node", "server/index.mjs"]
