# Platform is set at build time via docker compose / docker build (see README).
# Omit DOCKER_PLATFORM for host-native (e.g. Apple Silicon). Set DOCKER_PLATFORM=linux/amd64 for ECS/Fargate.
FROM node:20-slim

# Install Chromium, curl (for ECS health check), and runtime dependencies for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    curl \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Use system Chromium (Puppeteer will not download its own)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --production

EXPOSE 3001

CMD ["node", "dist/index.js"]
