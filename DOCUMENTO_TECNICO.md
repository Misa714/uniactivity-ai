# Documento Técnico — UniActivity AI
### Evaluación Final · Asignatura DevOps · Universidad Adventista de Chile
**Estudiante de Ingeniería en Informática**

---

## 1. Introducción

En este proyecto presento **UniActivity AI**, una plataforma web diseñada para la gestión de actividades universitarias que implementé utilizando una arquitectura DevOps completa. A lo largo del semestre, he aprendido a utilizar las herramientas más demandadas en la industria para automatizar el ciclo de vida del desarrollo de software, y en este trabajo final integré todas estas piezas.

El proyecto abarca el ciclo completo: desde el empaquetado y aislamiento en contenedores con Docker, la orquestación en desarrollo con Docker Compose, la validación estática y automatizada mediante GitHub Actions (CI), hasta el despliegue final en una máquina virtual de Amazon Web Services (AWS EC2) monitoreada activamente por PM2. Además, incorporé un motor de asistencia cognitiva local (IA) que ayuda a redactar descripciones académicas en segundos.

**Mi objetivo con este documento** es detallar cómo configuré y conecté cada una de estas tecnologías, las decisiones técnicas que tomé durante el camino, los problemas reales que tuve que resolver y cómo esta arquitectura garantiza un flujo de entrega de software seguro y reproducible.

---

## 2. Descripción del Proyecto y Problemática

### El Problema a Resolver
En mi entorno universitario he notado que la información de actividades extracurriculares, ayudantías, tutorías y proyectos de investigación suele estar dispersa en correos, archivos de Excel y formularios aislados. Esto dificulta el seguimiento de asistencia y la participación de los alumnos. 

Para resolver esto, diseñé **UniActivity AI**, una aplicación web fullstack interactiva que divide sus funciones en dos perfiles de usuario bien definidos:

| Rol | Mis Funcionalidades Implementadas |
|---|---|
| **Admin (Docente)** | Crear, modificar y eliminar actividades académicas · Ver participantes inscritos · Registrar asistencia y actualizar seguimiento. |
| **Estudiante** | Consultar la cartelera de actividades · Inscribirse a actividades disponibles · Visualizar su participación. |

### Mi Stack Tecnológico Seleccionado
Para construir esta plataforma decidí utilizar las siguientes tecnologías:

| Capa | Tecnología | Archivo o Directorio Clave |
|---|---|---|
| **Servidor / Backend** | Node.js con Express 5 | `src/app.js` |
| **Base de Datos** | SQLite 3 (Base de datos relacional) | `src/database/db.js` |
| **Seguridad y Cifrado** | JWT (JSON Web Tokens) y bcryptjs | `src/middleware/auth.js` |
| **Interfaz / Frontend** | HTML5, CSS3 personalizado y Bootstrap 5 | `public/index.html` y `public/dashboard.html` |
| **Asistente de IA** | Motor de filtrado inteligente local por palabras clave | `src/controllers/aiController.js` |
| **Contenedorización** | Docker y Docker Compose | `Dockerfile` y `docker-compose.yml` |
| **Monitoreo Local** | PM2 (Process Manager 2) | Integrado en la fase final del `Dockerfile` |
| **Pipeline de CI** | GitHub Actions | `.github/workflows/devops.yml` |
| **Infraestructura Cloud** | AWS EC2 (Amazon Linux 2023) | `http://54.164.50.235:3000` |

### Flujo de Navegación de la Aplicación
El flujo de datos y peticiones que estructuré se comporta de la siguiente manera:
```
Usuario → index.html → POST /api/auth/login → Generación de JWT
       → dashboard.html → GET /api/activities (Verificando JWT en cabeceras)
       → [Docente]     POST /api/activities           → Inserta en base de datos SQLite
       → [Estudiante]  POST /api/activities/inscribe  → Crea registro de inscripción
       → [Docente]     GET /api/activities/:id/participants → Lista inscritos
       → [Docente]     PUT /api/activities/participants/:id → Modifica asistencia
```

---

## 3. Arquitectura DevOps Propuesta

Para automatizar el desarrollo y el despliegue, propuse y dibujé el siguiente flujo de trabajo:

```
  Desarrollador (Mi equipo local)
        │
        │ Git Push → Rama principal (main)
        ▼
  Repositorio GitHub
        │
        ├──► GitHub Actions (Mi pipeline de Integración Continua)
        │         ├── npm ci (Instalación limpia de dependencias)
        │         ├── npm run lint (Verificación estética con ESLint)
        │         ├── npm test (Pruebas de endpoints con Jest)
        │         └── docker build (Prueba de compilación de imagen)
        │
        └──► Docker Compose (Orquestación local y en EC2)
                  │
                  ▼
            Contenedor Docker
            ┌────────────────────────────────────────┐
            │  PM2 (Monitoreo en Foreground)         │
            │    └── Proceso Node.js (Servidor Web)  │
            │         └── SQLite (Almacenamiento)    │
            │    [Expuesto en Puerto 3000]           │
            └────────────────────────────────────────┘
                  │ Volumen Externo de Datos
                  ▼
            sqlite_data (Volumen Docker Persistente)

            AWS EC2 (Despliegue final) → http://54.164.50.235:3000
```

### Justificación de mis decisiones de diseño:
*   **Contenedores independientes:** Permiten que mi aplicación funcione igual en mi laptop que en la nube de AWS.
*   **Persistencia desacoplada:** Elegí utilizar volúmenes lógicos en Docker porque SQLite escribe directamente en un archivo. Si no desacoplaba ese archivo, los datos se perderían cada vez que yo actualizara la imagen Docker de la aplicación.
*   **Monitoreo integrado:** Al utilizar PM2 dentro de mi contenedor, garantizo que si el servidor web sufre un error imprevisto (un crash por excepción), la aplicación se levante sola inmediatamente en milisegundos.

---

## 4. Docker y Docker Compose

### Mi Dockerfile (Estructura Multi-stage)
Para compilar y empaquetar la aplicación de manera óptima, escribí un `Dockerfile` estructurado en dos etapas de construcción:

```dockerfile
# ETAPA 1: Construcción y Compilación de dependencias nativas
FROM node:20-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm rebuild sqlite3 --build-from-source

# ETAPA 2: Imagen de ejecución ligera final
FROM node:20-bookworm-slim
RUN npm install -g pm2
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN mkdir -p /data
EXPOSE 3000
CMD ["pm2-runtime", "src/app.js", "--name", "uniactivity-ai"]
```

#### Lo que aprendí sobre esta configuración:
1.  **¿Por qué usar Multi-Stage?** La dependencia `sqlite3` de Node requiere compilar código binario nativo en C++. Para compilarlo, necesito instalar `python3`, `make` y `g++`. Si dejo esas herramientas en mi imagen final, ocuparía más de 500MB y tendría vulnerabilidades de seguridad. Al usar dos fases, compilo en el `builder` y en la fase final solo me quedo con los binarios listos, reduciendo el tamaño a la mitad.
2.  **¿Por qué `pm2-runtime`?** En Docker no puedo usar `pm2 start` común, ya que se ejecuta en segundo plano (daemon) y el contenedor se apagaría al no detectar un proceso activo en primer plano. `pm2-runtime` está pensado para contenedores porque mantiene el flujo de logs en primer plano.

### Mi Docker Compose (`docker-compose.yml`)
Para levantar todo de forma simple, utilicé la siguiente configuración:

```yaml
services:
  app:
    build: .
    container_name: uniactivity_app
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - sqlite_data:/data
    restart: always

volumes:
  sqlite_data:
```

*   `restart: always`: Asegura que el contenedor se levante automáticamente si el demonio Docker se reinicia o el servidor físico se apaga.
*   `sqlite_data:/data`: Monta el volumen de datos persistente en un directorio `/data` fuera del código de la app, aislando el archivo SQLite.

### Problemas reales de aprendizaje que solucioné:
*   **Problema 1: Error de GLIBC_2.38 no encontrada:** Al usar imágenes basadas en Alpine Linux para compilar SQLite, a veces faltaban las librerías dinámicas del sistema de destino. Lo solucioné usando la distribución Debian Slim (`node:20-bookworm-slim`) en ambas fases de mi Dockerfile y compilando el driver nativo con `--build-from-source`.
*   **Problema 2: Desaparición de archivos por volumen mal montado:** Al principio montaba el volumen directamente sobre `/app/src/database`. Esto hacía que Docker montara una carpeta vacía encima de mi código del backend, borrando el archivo JavaScript de inicialización de base de datos. Lo solucioné moviendo la ruta de la base de datos a `/data/uniactivity.sqlite` y modificando el código de mi servidor en `src/database/db.js` para crear el directorio dinámicamente si no existía.

---

## 5. Pipeline CI/CD (Automatización en GitHub)

Para asegurar la calidad de mi código en cada cambio, configuré mi primer pipeline de integración continua con GitHub Actions en `.github/workflows/devops.yml`:

```yaml
name: Pipeline UniActivity AI CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout del codigo
      uses: actions/checkout@v4

    - name: Configurar Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 22

    - name: Instalamos dependencias (npm ci)
      run: npm ci

    - name: Hacer Lint en el Codigo (ESLint)
      run: npm run lint

    - name: Test de Aplicacion (Jest)
      run: npm test

    - name: Construccion de imagen Docker (Build)
      run: docker build -t uniactivity-ai-app:latest .
```

### Explicación de las herramientas de calidad:
*   **ESLint:** Me ayuda a mantener mi código limpio. Por ejemplo, me advierte si declaro variables que no estoy usando o si cometo errores de sintaxis comunes en Javascript.
*   **Prettier:** Lo utilicé para dar formato consistente al código de manera automática (espaciado, comillas simples, uso de punto y coma).
*   **Jest y Supertest:** Diseñé pruebas automatizadas de integración. Implementé validaciones para comprobar que la ruta pública `/api/health` responda correctamente, y pruebas de seguridad críticas para verificar que mis rutas privadas efectivamente bloqueen a usuarios que no posean un token JWT en su cabecera, respondiendo con un estado HTTP 401.

---

## 6. AWS (Infraestructura Cloud)

Para desplegar mi proyecto, utilicé una instancia de **Amazon EC2 (Elastic Compute Cloud)** de nivel gratuito con el sistema operativo **Amazon Linux 2023**.

*   **IP Pública de Producción:** `54.164.50.235`
*   **URL de la Aplicación:** `http://54.164.50.235:3000`

### Mis Pasos de Despliegue en la Nube:
1.  Creé y configuré la instancia EC2 en la consola de AWS.
2.  Configuré el **Security Group** de mi servidor con las siguientes reglas de puerto:
    *   Puerto 3000 de entrada (TCP) abierto a todo el mundo (`0.0.0.0/0`) para permitir el acceso web a la aplicación.
    *   Puerto 22 (SSH) abierto solo a mi dirección IP local para conectarme de forma segura.
3.  Ingresé por SSH a la instancia, instalé Git y Docker Compose.
4.  Cloné el repositorio de GitHub y ejecuté:
    ```bash
    git pull origin main
    docker compose up -d --build
    ```

---

## 7. Seguridad Implementada

La seguridad fue un pilar clave en mi desarrollo. Implementé las siguientes medidas de protección:

1.  **Variables de Entorno y Exclusión de Secrets:** Mi clave de firma JWT (`JWT_SECRET`) y el puerto se configuran exclusivamente en un archivo local `.env`. Me aseguré de agregarlo a mi archivo `.gitignore` para no subir jamás mis credenciales al repositorio público de GitHub.
2.  **Hasheo de Contraseñas:** En lugar de guardar las contraseñas en texto plano dentro de SQLite, utilicé la librería **bcryptjs** para generar hashes seguros con 10 rondas de encriptación.
3.  **Seguridad Stateless con JWT:** Protegí todas las llamadas a la base de datos de actividades requiriendo que los usuarios inicien sesión y envíen un JSON Web Token firmado en la cabecera `Authorization`.
4.  **Control de Acceso basado en Roles (RBAC):** Configuré mi middleware personalizado para bloquear y proteger acciones críticas. Por ejemplo, los estudiantes solo pueden registrarse y ver actividades, mientras que las acciones de creación, modificación, eliminación y control de asistencia están restringidas exclusivamente al rol `Admin`.

---

## 8. Evidencias de Funcionamiento

### PM2 corriendo de forma exitosa en el contenedor del servidor EC2
Al conectarme por SSH y consultar el estado del proceso interno del contenedor, esta es la salida real que obtuve:

```
[ec2-user@ip-172-31-23-107 uniactivity-ai]$ docker exec uniactivity_app pm2 status
┌────┬───────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name              │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼───────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ uniactivity-ai    │ default     │ 1.0.0   │ fork    │ 18       │ 4s     │ 0    │ online    │ 0%       │ 56.5mb   │ root     │ disabled │
└────┴───────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
```

### Docker Compose levantando la red y volumen en AWS
```
[+] Running 2/2
 ✔ Network uniactivity-ai_default  Created
 ✔ Container uniactivity_app       Started
```

### Comandos de depuración útiles que aprendí:
*   Ver logs de la aplicación en tiempo real: `docker compose logs -f`
*   Ver estado del contenedor: `docker compose ps`
*   Ejecutar pruebas del backend localmente: `npm test`

---

## 9. Propuesta de Escalabilidad utilizando Kubernetes

El sistema actual corre en un único contenedor alojado en una única instancia EC2. Entiendo que esta solución no es escalable si miles de estudiantes acceden a la vez. Para evolucionar esta arquitectura, propongo la migración a un orquestador de **Kubernetes (K8s)**.

### Mi Diseño de Arquitectura para Escalabilidad:
```
Petición de Usuario (Internet)
            │
            ▼
    AWS LoadBalancer (ALB / Ingress)
            │
      ┌─────┴─────┐
      ▼           ▼
   [Pod 1]     [Pod 2]   <-- Réplicas de mi contenedor Web (Escalado horizontal)
      │           │
      └─────┬─────┘
            ▼
    Base de Datos RDS (PostgreSQL) <-- Desacoplada y redundante
```

### Mi Manifiesto K8s de Ejemplo (Deployment y Service)
Escribí este manifiesto conceptual para desplegar 3 réplicas de mi servidor web en un clúster de Kubernetes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uniactivity-deployment
spec:
  replicas: 3
  selector:
    matchLabels:
      app: uniactivity-web
  template:
    metadata:
      labels:
        app: uniactivity-web
    spec:
      containers:
      - name: web-app
        image: uniactivity-ai-app:production
        ports:
        - containerPort: 3000
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
---
apiVersion: v1
kind: Service
metadata:
  name: uniactivity-service
spec:
  type: LoadBalancer
  selector:
    app: uniactivity-web
  ports:
  - port: 80
    targetPort: 3000
```

### Beneficios del cambio que propongo:
1.  **De SQLite a PostgreSQL:** SQLite bloquea la base de datos entera al escribir. En un entorno multi-pod, necesitamos migrar a una base de datos distribuida como **Amazon RDS PostgreSQL** para que múltiples pods puedan escribir concurrentemente.
2.  **Balanceador de Carga:** El `Service` de tipo `LoadBalancer` distribuye el tráfico equitativamente entre las 3 réplicas de mi aplicación.
3.  **Autoescalado (HPA):** Podríamos habilitar un Horizontal Pod Autoscaler para que si la CPU de mis contenedores supera el 75%, Kubernetes levante más pods automáticamente y los apague cuando baje el tráfico.

---

## 10. Conclusiones y Aprendizaje

### Logros obtenidos en mi desarrollo:
1.  **Aislamiento y Reproducibilidad:** Comprendí en la práctica la importancia de Docker. Pude construir mi aplicación en mi máquina y llevarla a un servidor AWS corriendo Linux con la total seguridad de que funcionará exactamente igual.
2.  **Calidad integrada:** Configurar un pipeline de CI me enseñó que la automatización previene errores humanos. Si subo código que rompe mis pruebas o incumple las reglas estéticas, GitHub Actions detiene el proceso y protege la rama principal.
3.  **Gestión de datos segura:** Aprendí a separar la persistencia de datos físicos (en el volumen externo de Docker) del ciclo de vida volátil del contenedor.

### Lecciones aprendidas y autocrítica:
*   Al principio me costó entender el flujo de compilación nativa en contenedores Alpine Linux. Esto me enseñó que es crucial saber elegir la imagen base correcta (como Debian slim) cuando trabajamos con bases de datos embebidas nativas como SQLite3.
*   En el futuro, pretendo automatizar el despliegue automático (CD) por SSH desde GitHub Actions hacia AWS cada vez que el pipeline CI termine de forma exitosa, eliminando la necesidad de entrar manualmente al servidor a hacer `git pull`.

---
*Elaborado por mí — Evaluación Final DevOps · Asignatura DevOps · Universidad Adventista de Chile · 2026*
