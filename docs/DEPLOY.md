# DEPLOY — DuoBalance Beta

> Guía de despliegue y configuración de entornos (dev / producción) para DuoBalance.
> Estado: **pre-beta** — el MVP funciona en local; este documento define cómo llevarlo a producción.

---

## 1. Resumen ejecutivo

### Stack de despliegue

| Tecnología | ¿Dónde? | ¿Para qué? | ¿Se duerme? |
|-----------|---------|-------------|-------------|
| Oracle Cloud Always Free | Oracle | Infraestructura principal | ❌ |
| Oracle Ampere A1 VM | Oracle | Servidor donde vive la aplicación | ❌ |
| Ubuntu Server 24.04 LTS (ARM64) | Dentro de VM | Sistema operativo (sin entorno gráfico) | ❌ |
| Docker | Dentro de VM | Ejecutar servicios aislados (NestJS / Postgres) | ❌ |
| Nginx | Host (Ubuntu) | Reverse proxy + HTTPS (certbot / Let's Encrypt) | ❌ |
| NestJS | Dentro de Docker | Backend/API | ❌ |
| PostgreSQL | Dentro de Docker | Base de datos | ❌ |
| Cloudflare | Externo | DNS + CDN + protección/HTTPS | ❌ |
| Cloudflare R2 | Externo | Object storage (uploads) — preferiblemente privado | ❌ |
| Cloudflare Pages | Externo | Frontend web (Expo export) | ❌ |
| GitHub Actions | Externo (opcional) | CI/CD y despliegues automáticos | ❌ |

### Servicios externos

| Pieza | Proveedor | Costo | Estado |
|-------|-----------|-------|--------|
| Backend + DB + Nginx | Oracle Cloud Always Free (VM Ampere A1) | **$0/mes*** | Por desplegar |
| Storage (uploads) | Cloudflare R2 (object storage) — preferir buckets privados | **$0/mes*** | Por configurar |
| Frontend web | Cloudflare Pages (estático) | **$0/mes** | Por desplegar |
| Dominio API | `api-duobalance.duckdns.org` (DuckDNS) o dominio propio gestionado por Cloudflare | **$0** | Por configurar |
| Dominio frontend | `duobalance.pages.dev` (Cloudflare Pages) | **$0** | Por configurar |
| HTTPS API | Let's Encrypt + certbot (Nginx en host) — usar con Cloudflare SSL Mode `Full (strict)` | **$0** | Por configurar |
| HTTPS frontend | Cloudflare (auto) | **$0** | Automático |

**Costo potencial: $0/mes dentro de los límites gratuitos.**

> ⚠️ Los límites gratuitos pueden cambiar. Verificar los tiers actuales antes de desplegar.

---

## 2. Arquitectura

### 2.1 La VM como centro de todo

Una VM (Virtual Machine) se comporta como un servidor Linux remoto. Para DuoBalance se recomienda específicamente:

- Ubuntu Server 24.04 LTS
- Arquitectura: ARM64 / aarch64 (Ampere A1)
- Sin entorno gráfico
- Docker Engine + Docker Compose

```
              SERVIDOR FÍSICO DE ORACLE
┌─────────────────────────────────────────┐
│                                         │
│     ┌──────────┐ ┌──────────┐           │
│     │    VM 1  │ │    VM 2  │           │
│     └──────────┘ └──────────┘           │
│                                         │
│     ┌──────────────────────────┐        │
│     │     TU VM                │        │
│     │ Ubuntu Server 24.04 LTS  │        │
│     │ Arquitectura: ARM64      │        │
│     │ Sin entorno gráfico      │        │
│     └──────────────────────────┘        │
│                                         │
└─────────────────────────────────────────┘
```

### 2.2 Arquitectura de despliegue (resumida)

```
                    INTERNET
                       │
                       ▼
                ┌────────────┐
                │ Cloudflare │
                │ DNS + HTTPS│
                └─────┬──────┘
                      │
                      ▼
          ┌─────────────────────┐
          │   ORACLE CLOUD      │
          │   ALWAYS FREE       │
          │ Ubuntu Server 24.04 │
          │      ARM64          │
          │                     │
          │ ┌──────────┐        │
          │ │  Nginx   │ (host) │
          │ └────┬─────┘        │
          │      │              │
          │   Docker Compose    │
          │   ┌──────────┐      │
          │   │  NestJS  │      │
          │   └──────────┘      │
          │   ┌──────────┐      │
          │   │Postgres  │      │
          │   └──────────┘      │
          └─────────────────────┘
                      │
                      ▼
             Cloudflare R2 (storage)
```

### 2.3 Flujo de datos

1. Usuario accede a `https://duobalance.pages.dev` (Cloudflare Pages + CDN).
2. Frontend hace peticiones a `https://api-duobalance.<tu-dominio>`.
3. Cloudflare resuelve DNS y pasa tráfico a la IP pública de Oracle (o lo proxiea según tu configuración).
4. Nginx (host) recibe la petición y la proxy_pass a la API que corre dentro de Docker Compose.
5. NestJS (contenedor) responde y consulta PostgreSQL (contenedor).
6. Para archivos, NestJS usa Cloudflare R2; **no** recomendamos dejar comprobantes privados en buckets públicos.

### 2.4 ¿Qué queda dentro de Oracle?

```
                 ORACLE CLOUD
                      │
                      ▼
              ┌──────────────┐
              │      VM      │
              │ Ubuntu Server│
              │ 24.04 LTS    │
              │  (ARM64)     │
              │              │
              │ ┌──────────┐ │
              │ │  Nginx   │ │
              │ │ (host)   │ │
              │ └────┬─────┘ │
              │      │       │
              │ ┌────▼──────┐│
              │ │ Docker    ││
              │ │ Compose   ││
              │ └──┬───────┘ │
              │    │         │
              │ ┌──▼──────┐  │
              │ │NestJS   │  │
              │ │(container)│ │
              │ └──────────┘  │
              │ ┌──────────┐  │
              │ │Postgres  │  │
              │ │(container)│ │
              │ └──────────┘  │
              └──────────────┘
```

### 2.5 ¿Qué queda fuera de Oracle?

- Cloudflare — DNS, CDN, protección.
- Cloudflare R2 — Object storage (preferir buckets privados y URLs firmadas para comprobantes privados).
- Cloudflare Pages — Frontend estático (Expo web export).
- GitHub Actions — CI/CD opcional.

---

## 3. Configuración de entornos

### 3.1 Frontend (`DuoBalance-app`)

Expo utiliza `.env.development`/`.env.production` como ya está definido. Asegúrate de que `EXPO_PUBLIC_API_URL` en `.env.production` apunte a `https://api-duobalance.<tu-dominio>`.

### 3.2 Backend (`duobalance-api`)

Variables de entorno requeridas (resumido — ver `src/config/env.config.ts` para el listado completo):

- `PORT` — puerto (3000)
- `DATABASE_URL` — Connection string Postgres
- `JWT_SECRET` — secreto seguro
- `FRONTEND_URL` — URL pública del frontend
- `CORS_ORIGINS` — orígenes permitidos (CSV)
- `R2_*` — credenciales de Cloudflare R2

Importante: el valor de `DATABASE_URL` depende del contexto:

> En desarrollo (API ejecutándose en el host): `postgresql://user:pass@localhost:5432/db`

> En producción con Docker Compose (API en un contenedor y Postgres en otro): `postgresql://user:pass@postgres:5432/db` — usa el nombre del servicio `postgres`.

Recomendación: centralizar variables en `/opt/duobalance/.env` y en `docker-compose.yml` usar `env_file: - .env` para leerlas.

Generar `JWT_SECRET` seguro:

```bash
openssl rand -hex 32
```

---

## 4. Flujo de ramas (git)

### 4.1 Estrategia (sugerida para la beta)

| Rama | Propósito |
|------|-----------|
| `main` | Producción estable — deploys |
| `dev` | Integración diaria |
| `feature/*` | Trabajo en features |

Workflow mínimo: `feature/* → dev → main`.

---

## 5. Modo desarrollo (local)

Backend:

```bash
cd duobalance-api
cp .env.example .env
# editar .env con DATABASE_URL (postgres local), JWT_SECRET, MAIL keys, FRONTEND_URL, CORS_ORIGINS, R2 keys
pnpm install --frozen-lockfile
npx prisma migrate dev
pnpm start:dev
```

Frontend:

```bash
cd DuoBalance-app
pnpm install --frozen-lockfile
pnpm web
```

URLs locales

- Frontend: `http://localhost:8081`
- Backend API: `http://localhost:3000`

---

## 6. Despliegue en producción (resumen de fases clave)

Esta sección resume cambios importantes ya incorporados en la versión corregida del plan.

### FASE 0 — Seguridad antes de producción (obligatorio)

- SSH únicamente con llave; deshabilitar password authentication.
- Deshabilitar `PermitRootLogin` en SSH.
- UFW habilitado: permitir OpenSSH (solo tu IP), 80 y 443.
- PostgreSQL no expuesto públicamente.
- Nginx como único punto HTTP/HTTPS.
- `.env` en `/opt/duobalance/.env` con permisos `600`.
- Backups enviados fuera de la VM (Object Storage / descarga externa).

### FASE 1 — Preparar producción

Variables de entorno documentadas y validadas.
Agregar health endpoint `/health` si no existe.

---

### FASE 2 — Oracle Cloud: crear VM

Pasos clave:

1. Crear VM Ampere A1 con Ubuntu Server 24.04 LTS (ARM64).
2. Reservar IP pública estática.
3. Configurar SSH (key-based) y seguridad en el OCI console.
4. Configurar firewall en la VM (ufw):

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

5. Crear estructura de directorios:

```bash
sudo mkdir -p /opt/duobalance/data/postgres
sudo chown -R ubuntu:ubuntu /opt/duobalance
```

---

### FASE 3 — PostgreSQL en la VM (Docker)

Recomendaciones:

- Usar Docker Compose con volúmenes en `/opt/duobalance/data/postgres`.
- No exponer Postgres al exterior; sólo accesible desde la red de Compose/Nginx.

Ejemplo mínimo en `docker-compose.yml` (ver FASE 4): usar `env_file` para credenciales.

---

### FASE 4 — Backend (NestJS en Docker)

Objetivo: API en contenedor, migraciones via `prisma migrate deploy`.

Puntos importantes ya aplicados en esta guía:

- No usar PM2 si la API corre en Docker; Docker gestiona reinicios.
- Evitar duplicar `DATABASE_URL`: definirlo en `/opt/duobalance/.env` y usar `env_file`.
- No poner `POSTGRES_PASSWORD` en `docker-compose.yml` directamente; usar variables en `.env`.
- Añadir `networks:` en Compose (`duobalance` bridge) para claridad.
- Añadir `.dockerignore` en `duobalance-api/` (excluir `.env`, `node_modules`, `dist`, `.git`, `coverage`).

Comandos clave:

```bash
cd /opt/duobalance
sudo docker compose up -d --build
sudo docker compose exec api npx prisma migrate deploy
sudo docker compose logs -f api
```

---

### FASE 5 — Nginx (host) + HTTPS

Instalar Nginx y certbot en el host; usar `certbot --nginx` para generar certificados.

Si Cloudflare está delante, configurar SSL/TLS en `Full (strict)` y asegurar que Nginx tenga un certificado válido.

Ejemplo:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api-duobalance.<tu-dominio>
sudo certbot renew --dry-run
```

---

### FASE 6 — Storage para uploads (Cloudflare R2)

Recomendación de seguridad:

- `avatars/` puede ser público.
- `receipts/` **debe ser privado**: backend genera pre-signed URLs o sirve el fichero autenticado.

Guardar credenciales R2 en `/opt/duobalance/.env` y usarlas sólo en el backend.

---

### FASE 7 — Cloudflare Pages (frontend)

Configurar Pages con build command `pnpm install --frozen-lockfile && pnpm export:web` y `dist` como output.

---

### FASE 8 — Conectar frontend + backend

Checklist general (resumido): registro, verificación por email, login, crear pareja, registrar gasto, subir comprobante vía R2 (URL firmada), revisar balances, forgot password.

---

### FASE 9 — Backups

Script recomendado (usa `docker compose exec` para hacer dump desde el contenedor postgres):

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/db"
mkdir -p "$BACKUP_DIR"

sudo docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$BACKUP_DIR/duobalance_$TIMESTAMP.sql.gz"

# Subir a Object Storage (R2/Oracle) desde aquí
```

Programar cron y subir los backups fuera de la VM.

---

### FASE 10 — Monitorización básica

Comandos útiles (sin PM2):

```bash
sudo docker compose ps
sudo docker compose logs -f api
sudo docker compose logs -f postgres
sudo docker stats
```

Configurar endpoint `/health` y un servicio externo de uptime si se requiere.

---

### FASE 11 — Android (post-web)

Dejar para fases posteriores: usar EAS y builds nativas cuando la web y la API estén estables.

---

### FASE 12 — Prueba end-to-end de producción

Ejecutar el flujo completo desde registro hasta subida de comprobantes y restauración desde backup.

---

## 7. Resumen de comandos clave

```bash
# En el servidor
cd /opt/duobalance
sudo docker compose up -d --build
sudo docker compose ps
sudo docker compose logs -f api
sudo docker compose exec api npx prisma migrate deploy

# Backups
sudo docker compose exec -T postgres pg_dump -U $POSTGRES_USER -d $POSTGRES_DB | gzip > /opt/backups/db/duobalance_$(date +%Y%m%d_%H%M%S).sql.gz
```

---

## 8. Troubleshooting (resumen)

- uploads no cargan: verificar R2 credentials y que el backend genere URLs firmadas.
- CORS: comprobar `CORS_ORIGINS` y reiniciar los contenedores.
- Certbot: comprobar que DNS apunta a la VM antes de solicitar certificados.
- Contenedor reiniciándose: `sudo docker compose logs api`.

---

## 9. Referencias

- Expo CLI — Environment variables: https://docs.expo.dev/guides/environment-variables/
- NestJS — Configuration: https://docs.nestjs.com/techniques/configuration
- Oracle Cloud Always Free: https://www.oracle.com/cloud/free/
- Docker — Get Started: https://docs.docker.com/get-started/
- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL Docker Image: https://hub.docker.com/_/postgres
- Cloudflare R2 — Object Storage: https://developers.cloudflare.com/r2/
- Cloudflare Pages: https://developers.cloudflare.com/pages/
- Let's Encrypt — Certbot: https://certbot.eff.org/
- DuckDNS: https://www.duckdns.org/

---

## Apéndice: estructura recomendada en el servidor

```
/opt/duobalance/
├── docker-compose.yml
├── .env
├── duobalance-api/
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── prisma/
│   └── ...
├── data/
│   └── postgres/
└── backups/
```

**Última actualización:** 2026-08-20
