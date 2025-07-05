# Base Node.js image for all stages
FROM node:18-alpine AS base

# Build arguments for Supabase configuration
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG NEXT_PUBLIC_SITE_URL

# ===== DEPENDENCIES STAGE =====
# This stage installs all node_modules
FROM base AS deps
WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ gcc libc-dev linux-headers

COPY package.json package-lock.json ./
# Use clean install to ensure consistent installs
RUN npm ci

# ===== BUILD STAGE =====
# This stage builds the Next.js application
FROM base AS builder
WORKDIR /app

# Set build-time environment variables
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .
# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED 1
# Skip linting during build (we'll handle this separately)
ENV NEXT_SKIP_LINT 1
# Build the Next.js application
RUN npm run build

# ===== PRODUCTION STAGE =====
# Final stage that runs the application
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Set runtime environment variables
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Install Docker CLI and set up permissions properly
RUN apk add --no-cache \
    docker-cli \
    curl \
    shadow \
    libc-dev \
    linux-headers \
    && \
    # Create docker group with same GID as host
    addgroup -S -g 998 docker && \
    # Create non-root user
    addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs && \
    # Add nextjs user to docker group
    adduser nextjs docker && \
    # Cleanup
    apk del shadow

# Copy only the necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Set up Next.js cache directory and permissions
RUN mkdir -p .next && chown nextjs:nodejs .next && \
    # Ensure proper permissions for Docker socket access
    mkdir -p /var/run && \
    touch /var/run/docker.sock && \
    chown nextjs:docker /var/run/docker.sock

# Switch to non-root user
USER nextjs

# Add health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Expose the application port
EXPOSE 3000

# Set runtime environment variables
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the Next.js application
CMD ["node", "server.js"] 