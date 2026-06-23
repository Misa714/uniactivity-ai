# Etapa 1: Instalar dependencias (con herramientas de compilación para sqlite3)
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm rebuild sqlite3 --build-from-source

# Etapa 2: Imagen final con PM2 para monitoreo
FROM node:20-bookworm-slim

# Instalar PM2 globalmente para gestión de procesos y monitoreo
RUN npm install -g pm2

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Crear directorio para datos persistentes de SQLite (fuera del código fuente)
RUN mkdir -p /data

EXPOSE 3000

# PM2 ejecuta la app con logs y monitoreo integrado
CMD ["pm2-runtime", "src/app.js", "--name", "uniactivity-ai"]