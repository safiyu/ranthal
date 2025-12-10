# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts  
# Note: next.config.ts might need transpilation if not handled by next start automatically, 
# but usually 'npm start' (next start) handles it if 'typescript' is installed or it uses the built artifacts.
# Actually, standard next build produces what is needed in .next
# However, next.config.ts is needed at runtime? 
# "next start" uses the .next folder.

EXPOSE 3000

CMD ["npm", "start"]
