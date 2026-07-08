# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and prisma schema
COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client and build the app
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:24-alpine

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client from the builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application and prisma folder (needed for migrations)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 5000
ENV NODE_ENV=production

# Run database migrations and then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
