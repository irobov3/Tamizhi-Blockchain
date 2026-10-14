FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN addgroup -S tamizhi && adduser -S tamizhi -G tamizhi
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json .
USER tamizhi
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=10s CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "dist/index.js"]
