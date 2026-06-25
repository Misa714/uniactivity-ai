# Documento Técnico — UniActivity AI

### Evaluación Final · Asignatura DevOps · Universidad Adventista de Chile

---

## 1. Introducción

UniActivity AI es una plataforma web para la gestión de actividades universitarias construida con una arquitectura DevOps completa: desde el desarrollo local hasta el despliegue en producción en AWS.

El proyecto integra: contenedorización con Docker, automatización CI/CD con GitHub Actions, monitoreo con PM2, y un componente de Inteligencia Artificial Generativa para asistir en la descripción de actividades académicas.

**Objetivo del documento:** Describir técnicamente cada tecnología utilizada, su rol en el proyecto, y cómo todas las piezas forman un flujo DevOps funcional y reproducible.

---

## 2. Descripción del Proyecto

### ¿Qué hace UniActivity AI?

Aplicación web fullstack que permite gestionar actividades académicas con dos roles de usuario:

| Rol                 | Capacidades                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------- |
| **Admin (Docente)** | Crear, editar y eliminar actividades · Ver inscritos · Controlar asistencia y seguimiento |
| **Estudiante**      | Consultar actividades · Inscribirse · Ver estado                                          |

### Stack tecnológico

| Capa            | Tecnología               | Archivo clave                                |
| --------------- | ------------------------ | -------------------------------------------- |
| Servidor        | Node.js + Express 5      | `src/app.js`                                 |
| Base de datos   | SQLite 3 (relacional)    | `src/database/db.js`                         |
| Autenticación   | JWT + bcryptjs           | `src/middleware/auth.js`                     |
| Frontend        | HTML + CSS + Bootstrap 5 | `public/index.html`, `public/dashboard.html` |
| IA Generativa   | Motor local por keywords | `src/controllers/aiController.js`            |
| Contenerización | Docker + Docker Compose  | `Dockerfile`, `docker-compose.yml`           |
| Monitoreo       | PM2                      | Integrado en `Dockerfile`                    |
| CI/CD           | GitHub Actions           | `.github/workflows/devops.yml`               |
| Nube            | AWS EC2                  | `http://54.164.50.235:3000`                  |

### Flujo de usuario completo

```
Usuario → index.html → POST /api/auth/login → JWT
       → dashboard.html → GET /api/activities (token)
       → [Admin]      POST /api/activities           → Crea actividad en SQLite
       → [Estudiante] POST /api/activities/inscribe  → Inscripción
       → [Admin]      GET /api/activities/:id/participants → Lista inscritos
       → [Admin]      PUT /api/activities/participants/:id → Asistencia
```

---

## 3. Arquitectura DevOps

### Diagrama de flujo

```
  Desarrollador
       │
       │ git push → main
       ▼
  GitHub Repository
       │
       ├──► GitHub Actions (CI Pipeline)
       │         ├── npm ci
       │         ├── npm run lint (ESLint)
       │         ├── npm test (Jest)
       │         └── docker build
       │
       └──► docker compose up (local / EC2)
                 │
                 ▼
           Docker Container
           ┌─────────────────────┐
           │  PM2 (monitor)      │
           │    └── Node.js app  │
           │         └── SQLite  │
           │    [puerto 3000]    │
           └─────────────────────┘
                 │ volumen /data
                 ▼
           sqlite_data (persistente)

           AWS EC2 → http://54.164.50.235:3000
```

### Responsabilidades por componente

| Componente         | Responsabilidad                                        |
| ------------------ | ------------------------------------------------------ |
| **GitHub**         | Control de versiones, historial de commits, Actions    |
| **GitHub Actions** | Automatización de calidad y build de imagen            |
| **Docker**         | Empaquetado reproducible de la aplicación              |
| **Docker Compose** | Orquestación local con volumen persistente             |
| **PM2**            | Monitoreo, logs y reinicio automático del proceso Node |
| **AWS EC2**        | Servidor cloud para producción                         |
| **SQLite**         | Base de datos relacional, persistida en volumen Docker |

---

## 4. Docker y Docker Compose

### Dockerfile — Multi-stage build

El `Dockerfile` usa dos etapas para optimizar la imagen y garantizar compilación nativa correcta:

```dockerfile
# ETAPA 1 — Builder: compila módulos nativos
FROM node:20-bookworm-slim AS builder
RUN apt-get install -y python3 make g++   # herramientas para node-gyp
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm rebuild sqlite3 --build-from-source

# ETAPA 2 — Runtime: imagen final con PM2
FROM node:20-bookworm-slim
RUN npm install -g pm2
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /data
EXPOSE 3000
CMD ["pm2-runtime", "src/app.js", "--name", "uniactivity-ai"]
```

**¿Por qué dos etapas?**

- Stage 1 tiene `python3`, `make`, `g++` para compilar `sqlite3` desde fuente (evita el error `GLIBC_2.38 not found`).
- Stage 2 solo tiene lo necesario para ejecutar → imagen más pequeña y segura.

**¿Por qué `pm2-runtime`?**

- Versión de PM2 diseñada para Docker: mantiene el proceso en foreground para que Docker lo gestione correctamente, sin fork en background.

### Docker Compose

```yaml
services:
  app:
    build: .
    container_name: uniactivity_app
    ports:
      - '3000:3000'
    env_file:
      - .env
    volumes:
      - sqlite_data:/data # BD persistente fuera del código
    restart: always

volumes:
  sqlite_data:
```

**Decisiones clave:**

| Decisión            | Razón                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `restart: always`   | El contenedor se reinicia si falla o al reiniciar el servidor                            |
| `sqlite_data:/data` | Volumen en `/data`, separado del código en `/app`. Evita que sobrescriba archivos fuente |
| `env_file: .env`    | Variables sensibles no hardcodeadas en el Compose                                        |

### Problemas reales resueltos

**Problema 1 — Exit code 139 (Segmentation Fault):**
El volumen estaba montado en `/app/src/database`, reemplazando el directorio completo con el contenido vacío del volumen → el archivo `db.js` desaparecía al arrancar.
**Solución:** Mover el volumen a `/data` y actualizar `db.js` para detectar el directorio correcto.

**Problema 2 — GLIBC_2.38 not found:**
`sqlite3` v6 descarga binarios precompilados que requieren GLIBC 2.38, pero `node:20-bookworm-slim` tiene GLIBC 2.36.
**Solución:** `npm rebuild sqlite3 --build-from-source` + instalar herramientas de compilación en el builder.

---

## 5. Pipeline CI/CD

### Archivo: `.github/workflows/devops.yml`

Se activa automáticamente en cada `push` o `pull_request` a `main`.

```yaml
name: Pipeline UniActivity AI CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: docker build -t uniactivity-ai-app:latest .
```

### Pasos explicados

| Paso | Comando        | ¿Qué hace?                                                                           |
| ---- | -------------- | ------------------------------------------------------------------------------------ |
| 1    | `npm ci`       | Instala dependencias exactas del `package-lock.json`. Más estricto que `npm install` |
| 2    | `npm run lint` | Ejecuta ESLint. Si hay errores, el pipeline se detiene                               |
| 3    | `npm test`     | Ejecuta Jest. Verifica que el endpoint `/api/health` responde `200 OK`               |
| 4    | `docker build` | Construye la imagen completa. Valida que el Dockerfile es correcto                   |

### Calidad de código

| Herramienta          | Archivo config      | Rol                                                                        |
| -------------------- | ------------------- | -------------------------------------------------------------------------- |
| **ESLint**           | `eslint.config.js`  | Detecta errores y malas prácticas en JavaScript                            |
| **Prettier**         | `.prettierrc`       | Formateado consistente (comillas simples, sin trailing comma, tabWidth: 2) |
| **Jest + Supertest** | `tests/app.test.js` | Prueba el endpoint `/api/health` con petición HTTP real                    |

---

## 6. AWS

### Infraestructura

- **Servicio:** Amazon EC2 (Elastic Compute Cloud)
- **IP Pública:** `54.164.50.235`
- **Puerto:** `3000`
- **URL producción:** `http://54.164.50.235:3000`

### Proceso de despliegue en EC2

```bash
# En el servidor EC2 (Amazon Linux 2023)
git clone <repositorio>
cd uniactivity-ai
docker compose up -d --build
```

El mismo `Dockerfile` que funciona en desarrollo funciona en producción — esa es la ventaja central de Docker.

### Ventajas de Docker en EC2

| Ventaja              | Descripción                                        |
| -------------------- | -------------------------------------------------- |
| **Reproducibilidad** | Mismo `Dockerfile` en local y producción           |
| **Portabilidad**     | Migrar de servidor solo requiere clonar y levantar |
| **Aislamiento**      | La app no depende del OS del servidor              |

### Security Groups EC2

| Puerto | Protocolo | Origen       | Propósito               |
| ------ | --------- | ------------ | ----------------------- |
| `3000` | TCP       | `0.0.0.0/0`  | Acceso público a la app |
| `22`   | TCP       | IP del admin | Acceso SSH              |

---

## 7. Seguridad

### Variables de entorno

El archivo `.env` contiene los secrets y **no se sube a GitHub** (incluido en `.gitignore`):

```env
PORT=3000
JWT_SECRET=clave_secreta_para_tokens_123
```

Cargado en Docker con `env_file: .env` en el Compose.

### GitHub Secrets

Las variables sensibles se configuran en `Settings → Secrets and variables → Actions` del repositorio, nunca en el código fuente.

### Autenticación JWT

- Token generado en login con `jwt.sign()`, expira en **2 horas**.
- Cada petición protegida pasa por `src/middleware/auth.js` que verifica la firma.
- Payload del token: `{ id, username, role }`.

### Control de acceso por rol

```
GET  /api/activities                    → Cualquier token válido
POST /api/activities                    → Solo 'Admin'
PUT  /api/activities/:id                → Solo 'Admin'
DELETE /api/activities/:id              → Solo 'Admin'
POST /api/activities/inscribe           → Cualquier token válido
PUT  /api/activities/participants/:id   → Solo 'Admin'
POST /api/ai/generate                   → Cualquier token válido
```

### Contraseñas

Hasheadas con **bcryptjs** (salt rounds: 10). Nunca se almacena la contraseña en texto plano en SQLite.

---

## 8. Evidencias

### PM2 corriendo en el contenedor

```
┌────┬────────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┐
│ id │ name           │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ mem      │
├────┼────────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┤
│ 0  │ uniactivity-ai │ 1.0.0   │ fork    │ 30       │ 0s     │ 0    │ online    │ 45.1mb   │
└────┴────────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┘
```

### Docker Compose levantado

```
✔ Network uniactivity-ai_default    Created
✔ Volume uniactivity-ai_sqlite_data Created
✔ Container uniactivity_app         Started
```

### Logs de arranque

```
uniactivity_app  | Servidor corriendo en: http://localhost:3000
uniactivity_app  | Conectado a la base de datos SQLite.
uniactivity_app  | Estructura de datos relacional inicializada correctamente.
```

### Comandos de verificación

```bash
# Estado de PM2
docker exec uniactivity_app pm2 status

# Logs en tiempo real
docker compose logs -f

# Health check de la API
curl http://54.164.50.235:3000/api/health
# → {"status":"ok","message":"Servidor UniActivity AI levantado."}
```

---

## 9. Propuesta de Escalabilidad con Kubernetes

### ¿Por qué Kubernetes?

El sistema actual corre en un único contenedor en EC2. Si el número de usuarios crece, se necesita escalar horizontalmente. Kubernetes (K8s) permite múltiples instancias con balanceo de carga automático.

### Arquitectura propuesta

```
Internet
    │
    ▼
LoadBalancer (AWS ALB / K8s Ingress)
    │
    ├── Pod 1: uniactivity-ai
    ├── Pod 2: uniactivity-ai   ← réplicas automáticas
    └── Pod 3: uniactivity-ai
              │
              ▼
       PersistentVolumeClaim (AWS EBS)
              │
              ▼
         PostgreSQL (reemplaza SQLite)
```

### Manifiesto Kubernetes — Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uniactivity-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: uniactivity-ai
  template:
    metadata:
      labels:
        app: uniactivity-ai
    spec:
      containers:
        - name: app
          image: uniactivity-ai-app:latest
          ports:
            - containerPort: 3000
          env:
            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: uniactivity-secrets
                  key: jwt_secret
---
apiVersion: v1
kind: Service
metadata:
  name: uniactivity-service
spec:
  type: LoadBalancer
  selector:
    app: uniactivity-ai
  ports:
    - port: 80
      targetPort: 3000
```

### Comparativa: estado actual vs Kubernetes

| Aspecto       | Estado actual         | Con Kubernetes                 |
| ------------- | --------------------- | ------------------------------ |
| Base de datos | SQLite (1 archivo)    | PostgreSQL (concurrencia real) |
| Escalado      | Manual (1 contenedor) | HPA automático                 |
| Secrets       | `.env` local          | K8s Secrets                    |
| CI/CD destino | EC2 directo           | ECR → EKS (AWS)                |
| Monitoreo     | PM2                   | PM2 + Prometheus + Grafana     |

### Herramientas AWS recomendadas

- **Amazon EKS:** Kubernetes gestionado en AWS
- **Amazon ECR:** Registro privado de imágenes Docker
- **Amazon RDS (PostgreSQL):** BD gestionada para reemplazar SQLite
- **AWS ALB Ingress:** Balanceador de carga para K8s en AWS

---

## 10. Conclusiones

### Logros técnicos

1. **Flujo DevOps completo:** Pipeline desde el commit hasta producción, con validaciones automáticas de calidad en cada etapa (lint → test → build → deploy).

2. **Contenedorización robusta:** El Dockerfile multi-stage resolvió problemas reales de compatibilidad de GLIBC, demostrando la importancia de compilar módulos nativos dentro del entorno de destino.

3. **Separación de datos y código:** El uso correcto de volúmenes Docker garantiza que la base de datos persiste entre reinicios sin contaminar el sistema de archivos de la aplicación.

4. **Monitoreo integrado:** PM2 dentro del contenedor provee reinicio automático ante fallos, métricas de CPU/memoria y logs centralizados — sin infraestructura adicional.

5. **Seguridad por capas:** JWT stateless + bcryptjs + variables de entorno + control de acceso por rol en cada endpoint de la API.

### Lecciones aprendidas

- Los módulos nativos de Node.js deben compilarse en el mismo OS donde van a ejecutarse. Usar binarios precompilados con versiones de GLIBC diferentes causa crashes silenciosos.
- Los volúmenes Docker deben montarse en directorios de **datos**, no de **código fuente**.
- Un pipeline CI/CD garantiza que nadie introduce regresiones accidentalmente al hacer push.

### Próximos pasos

- Migrar de SQLite a PostgreSQL para soportar réplicas.
- Implementar CD automático hacia EC2 con GitHub Actions + SSH.
- Adoptar Kubernetes (EKS) para escalar según demanda.
- Monitoreo avanzado con Prometheus y Grafana.

---

_Documento técnico — Evaluación Final DevOps · Universidad Adventista de Chile · 2026_
