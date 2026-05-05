# ============================================================
# Tamizhi Blockchain — Multi-stage Docker build
# ============================================================

# -------------------------------------------------------
# Stage 1: builder
# -------------------------------------------------------
FROM golang:1.22-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    git \
    linux-headers \
    ca-certificates \
    curl \
    wget

# Set build environment
ENV CGO_ENABLED=1
ENV GOOS=linux
ENV GOARCH=amd64

WORKDIR /build

# Copy go module files first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the full source
COPY . .

# Build the binary with static linking and version metadata
RUN LDFLAGS="-s -w \
    -X github.com/cosmos/cosmos-sdk/version.Name=tamizhi \
    -X github.com/cosmos/cosmos-sdk/version.AppName=tamizhi \
    -X github.com/cosmos/cosmos-sdk/version.Version=$(git describe --tags --always --dirty 2>/dev/null || echo v0.1.0) \
    -X github.com/cosmos/cosmos-sdk/version.Commit=$(git log -1 --format='%H' 2>/dev/null || echo none) \
    -X github.com/cosmos/cosmos-sdk/version.BuildTags=netgo,osusergo,static_wasm" && \
    go build \
      -tags "netgo osusergo static_wasm" \
      -ldflags "$LDFLAGS" \
      -trimpath \
      -o /build/bin/tamizhi \
      ./cmd/tamizhi/

# Verify the binary was produced
RUN /build/bin/tamizhi version

# -------------------------------------------------------
# Stage 2: final minimal image
# -------------------------------------------------------
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    curl \
    bash \
    jq \
    tini

# Create a non-root user for running the daemon
RUN addgroup -S tamizhi && adduser -S tamizhi -G tamizhi

# Copy the compiled binary from the builder stage
COPY --from=builder /build/bin/tamizhi /usr/local/bin/tamizhi

# Copy any default config files (optional — can be volume-mounted)
# COPY config/ /etc/tamizhi/config/

# Set the home directory
ENV TAMIZHI_HOME=/home/tamizhi/.tamizhi
RUN mkdir -p $TAMIZHI_HOME && chown -R tamizhi:tamizhi /home/tamizhi

# Switch to the non-root user
USER tamizhi

WORKDIR /home/tamizhi

# Expose standard Cosmos SDK ports:
#   26656 — P2P
#   26657 — RPC (Tendermint/CometBFT)
#   1317  — REST API
#   9090  — gRPC
EXPOSE 26656 26657 1317 9090 6060

# Use tini as init process to handle signals properly
ENTRYPOINT ["/sbin/tini", "--", "tamizhi"]
CMD ["start", "--home", "/home/tamizhi/.tamizhi"]

# Health check using the RPC endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -sf http://localhost:26657/health || exit 1
