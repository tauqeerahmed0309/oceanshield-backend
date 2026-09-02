# ─────────────────────────────────────────────────────────────────
# OceanShield AI — Frontend
# Multi-stage: build with Node, serve with nginx
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (package-lock ensures reproducible builds)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# VITE_API_BASE_URL is injected at build time so the browser knows
# where to reach the backend.  docker-compose passes it via build-arg.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_DEMO_MODE=false

RUN npm run build

# ── Stage 2: serve ────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config: handle React Router (return index.html for all routes)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
