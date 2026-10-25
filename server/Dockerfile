# Rack Designer pack registry server.
# Build from the repository root:  docker build -f server/Dockerfile -t rack-designer-registry .

FROM node:22-alpine AS build
WORKDIR /src
# Only esbuild is needed to bundle the server; skip the desktop app's dependencies.
RUN npm init -y >/dev/null && npm install --no-audit --no-fund esbuild@0.28.2
COPY src/renderer/src/model ./src/renderer/src/model
COPY server/src ./server/src
RUN npx esbuild server/src/main.ts --bundle --platform=node --format=esm --target=node18 \
      --outfile=/out/registry-server.mjs --legal-comments=none

FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=5010 \
    HOST=0.0.0.0 \
    DATA_DIR=/data
WORKDIR /app
COPY --from=build /out/registry-server.mjs ./registry-server.mjs
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 5010
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1
CMD ["node", "registry-server.mjs"]
