# Build stage
FROM node:22.17.1-alpine AS builder

WORKDIR /app

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and pnpm workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the TypeScript code
RUN pnpm run build

# Production stage
FROM node:22.17.1-alpine AS production

WORKDIR /app

# Enable corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files and pnpm workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod && pnpm store prune

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 8000

# Health check
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "require('http').get('http://localhost:8000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["pnpm", "run", "serve"]