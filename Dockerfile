# -----------------------------------------
# Stage 1: Install dependencies
# -----------------------------------------
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files for better layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only (no devDependencies)
RUN npm ci --omit=dev --ignore-scripts 2>/dev/null || npm install --omit=dev --ignore-scripts

# -----------------------------------------
# Stage 2: Production image
# -----------------------------------------
FROM node:20-alpine AS production

# Security: run as non-root user
RUN addgroup -g 1001 -S botgroup && \
    adduser -S botuser -u 1001 -G botgroup

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY src/ ./src/

# Set ownership
RUN chown -R botuser:botgroup /app

USER botuser

# Environment
ENV NODE_ENV=production

# Health indicator
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "process.exit(0)"

# Start the bot
CMD ["node", "src/index.js"]
