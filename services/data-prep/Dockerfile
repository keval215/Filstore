FROM node:21-alpine3.20

# Security: Update packages and add dumb-init
RUN apk update && apk upgrade && apk add --no-cache dumb-init
RUN apk add --no-cache dumb-init postgresql-client
# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with security registry
RUN npm config set registry https://registry.npmjs.org/ && \
    npm install --only=production && \
    npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data/uploads /app/data/car /app/logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Expose port
EXPOSE 3002

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
