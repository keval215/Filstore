# Multi-stage Dockerfile for Filecoin Hybrid Backup
# Using security-hardened base images

# Stage 1: Build Go services (Gateway and Engine)
FROM golang:1.21-alpine3.19 AS go-builder

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copy Go modules first for better caching
COPY services/gateway/go.mod services/gateway/go.sum ./services/gateway/
COPY services/engine/go.mod services/engine/go.sum ./services/engine/

# Download dependencies
RUN cd services/gateway && go mod download && go mod verify
RUN cd services/engine && go mod download && go mod verify

# Copy source code
COPY services/gateway/ ./services/gateway/
COPY services/engine/ ./services/engine/
COPY shared/ ./shared/

# Build binaries with security flags
RUN cd services/gateway && CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -a -installsuffix cgo -o gateway main.go
RUN cd services/engine && CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -a -installsuffix cgo -o engine main.go

# Stage 2: Node.js services build stage
FROM node:21-alpine3.19 AS node-builder

# Install security updates and build dependencies
RUN apk update && apk upgrade && apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package.json files
COPY services/blockchain/package*.json ./services/blockchain/
COPY services/frontend/package*.json ./services/frontend/

# Install dependencies with timeout and retry settings
RUN cd services/blockchain && \
    npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000 && \
    npm install --only=production --no-audit && \
    npm cache clean --force
RUN cd services/frontend && \
    npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 10000 && \
    npm config set fetch-retry-maxtimeout 60000 && \
    npm install --only=production --no-audit && \
    npm cache clean --force

# Copy source code
COPY services/blockchain/ ./services/blockchain/
COPY services/frontend/ ./services/frontend/

# Stage 3: Gateway service - Using distroless for security
FROM gcr.io/distroless/static-debian12:nonroot AS gateway

WORKDIR /app
COPY --from=go-builder /app/services/gateway/gateway ./gateway
COPY --from=go-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["./gateway"]

# Stage 4: Engine service - Using distroless for security
FROM gcr.io/distroless/static-debian12:nonroot AS engine

WORKDIR /app
COPY --from=go-builder /app/services/engine/engine ./engine
COPY --from=go-builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

USER nonroot:nonroot
EXPOSE 9090
ENTRYPOINT ["./engine"]

# Stage 5: Blockchain service - Using slim base
FROM node:21-alpine3.19 AS blockchain

# Install only essential packages and remove cache
RUN apk update && apk upgrade && apk add --no-cache dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs \
    && rm -rf /var/cache/apk/*

WORKDIR /app
COPY --from=node-builder /app/services/blockchain/ .
RUN chown -R nodejs:nodejs /app

# Create wallet initialization script with proper permissions  
RUN chmod +x src/auto-wallet-init.js src/check-wallet.js

USER nodejs
EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "node src/auto-wallet-init.js && node index.js"]

# Stage 6: Frontend service - Using slim base
FROM node:21-alpine3.19 AS frontend

# Install only essential packages and remove cache
RUN apk update && apk upgrade && apk add --no-cache dumb-init \
    && addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001 -G nodejs \
    && rm -rf /var/cache/apk/*

WORKDIR /app
COPY --from=node-builder /app/services/frontend/ .
RUN chown -R nodejs:nodejs /app

USER nodejs
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
