# UniActivity AI 🚀

Plataforma Cloud para la Gestión de Actividades Universitarias con Asistencia de IA Generativa. Desarrollado como proyecto integral para la asignatura de DevOps en la Universidad Adventista de Chile (UNACH).

## 📊 URL de Producción
Acceso directo a la plataforma en AWS: [http://54.147.22.194:3000](http://54.147.22.194:3000)

## 🛠️ Tecnologías Utilizadas
* **Backend/Frontend:** Node.js / JavaScript
* **Base de Datos:** SQLite (Relacional con volumen persistente)
* **Calidad y Estilo:** ESLint & Prettier
* **Pruebas:** Jest
* **Contenerización:** Docker & Docker Compose (Multi-stage build con Tini)
* **Infraestructura Cloud:** AWS EC2 (Amazon Linux 2023)
* **CI/CD:** GitHub Actions

## 🚀 Pipeline de Integración Continua (CI)
El archivo `.github/workflows/devops.yml` automatiza los siguientes pasos ante cada `git push` a `main`:
1. `npm install` (Instalación de dependencias limpies)
2. `npm run lint` (Verificación estética con ESLint)
3. `npm test` (Pruebas unitarias con Jest)
4. `docker build` (Simulación de empaquetado de la imagen)

## 🐳 Despliegue Local y Producción
Para levantar el entorno completo con persistencia, clonar y ejecutar:
```bash
docker compose up -d --build
