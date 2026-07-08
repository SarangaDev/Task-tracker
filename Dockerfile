# ==========================================
# Stage 1: Build the Vue Frontend
# ==========================================
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Build the Express Backend
# ==========================================
FROM node:24-alpine AS backend-builder
WORKDIR /app/backend

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/prisma ./prisma

# Generate Prisma client and build the app
RUN npx prisma generate
RUN npm run build

# ==========================================
# Stage 3: Production Image
# ==========================================
FROM node:24-alpine
WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

# Install backend production dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy generated Prisma client from backend builder
COPY --from=backend-builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./node_modules/@prisma

# Copy built backend application and prisma folder
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/prisma ./prisma

# Copy built frontend application to be served by the backend
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 5000
ENV NODE_ENV=production

# Run database schema push and then start the server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
