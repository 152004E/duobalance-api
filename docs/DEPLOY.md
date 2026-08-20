# DEPLOY — DuoBalance Beta

> Guía completa de despliegue y configuración de entornos (dev / producción) para DuoBalance.
> Estado: **pre-beta** — el MVP funciona en local, este documento define cómo llevarlo a producción.

---

## 1. Resumen ejecutivo

| Pieza | Proveedor | Costo | Estado |
|-------|-----------|-------|--------|
| Backend API (NestJS) | Oracle Cloud Always Free (VM Ampere A1) | **$0/mes*** | Por desplegar |
| PostgreSQL (DB) | Neon (gestionado, free tier) | **$0/mes*** | Por configurar |
| Storage (uploads/) | Cloudflare R2 (object storage) | **$0/mes*** | Por configurar |
| Frontend web | Cloudflare Pages (estático) | **$0/mes** | Por desplegar |
| Dominio API | `api-duobalance.duckdns.org` (DuckDNS) | **$0** | Por configurar |
| Dominio frontend | `duobalance.pages.dev` (Cloudflare Pages) | **$0** | Por configurar |
| HTTPS API | Let's Encrypt + certbot | **$0** | Por configurar |
| HTTPS frontend | Cloudflare (auto) | **$0** | Automático |

**Costo potencial: $0/mes dentro de los límites gratuitos de cada proveedor.**

> ⚠️ Cada proveedor (Oracle, Neon, Cloudflare) tiene sus propios términos, límites y condiciones.
> Los límites gratuitos pueden cambiar. Verificar los tiers actuales antes de desplegar.
> Los $300 de trial de Oracle son separados del tier Always Free y se agotan en 30 días.

**Características clave de la API:**
- **Sin sleeps por inactividad** — la VM está encendida 24/7 (a diferencia de Vercel/Railway free tier)
- **Arquitectura separada** — si la VM muere, los datos (DB) y archivos (storage) sobreviven
- **Backups automáticos** — Neon gestiona los backups de la DB

---

### 1.1 Sobre Always Free de Oracle

Una VM de Oracle Always Free **no tiene un mecanismo de "sleep por inactividad"** como los tiers gratuitos de Vercel, Railway o Render. Sin embargo, una VM puede detenerse por:

- Mantenimiento programado de Oracle
- Problemas de infraestructura
- Acciones del usuario
- Límites de capacidad en la región
- Políticas de Oracle

La ventaja es que se comporta como un **servidor VPS tradicional**: siempre disponible mientras la cuenta esté activa y no se excedan los límites. **Oracle considera abandonadas las cuentas inactivas 30+ días** — con DuoBalance activo esto no debería ser problema.

**Límites Always Free (verificar en [oracle.com/cloud/free](https://www.oracle.com/cloud/free/))):**

| Recurso | Límite Always Free |
|---------|-------------------|
| VM Ampere A1 (ARM) | Hasta 4 OCPU + 24 GB RAM (total compartido) |
| VM AMD | 2 instancias, 1/8 OCPU + 1 GB RAM cada una |
| Block Volume | 200 GB total |
| Object Storage | 10 GB |
| Transferencia saliente | 10 TB/mes |
| Red | VCN, IP pública estática |

---

## 2. Arquitectura

### 2.1 Arquitectura separada (recomendada)

```
                        INTERNET
                           │
              ┌────────────┴────────────┐
              │                         │
        Cloudflare Pages            Oracle Cloud
          Frontend                  VM Ampere A1
        duobalance.pages.dev       (2 OCPU, 8 GB RAM)
                                      │
                                   Nginx
                                      │
                                   NestJS
                                   (API)
                                      │
                              ┌───────┴───────┐
                              │               │
                              ▼               ▼
                         Neon (DB)      Cloudflare R2
                       PostgreSQL        archivos/
                       gestionado       comprobantes
                       backups auto     avatares
```

**Ventajas de separar:**
- Si la VM muere, tus datos (DB) y archivos (R2) sobreviven.
- Neon hace backups automáticos de PostgreSQL.
- R2 no tiene costo de egress (a diferencia de S3).
- La VM es más liviana (solo corre NestJS + Nginx).
- Cada pieza escala independientemente.

### 2.2 Flujo de datos

1. Usuario accede a `https://duobalance.pages.dev` (Cloudflare CDN).
2. Frontend hace peticiones a `https://api-duobalance.duckdns.org`.
3. Nginx en Oracle VM recibe, proxy_pass a `localhost:3000`.
4. NestJS responde, consulta PostgreSQL en Neon (externo).
5. Para archivos (comprobantes/avatares), NestJS sube/baja desde Cloudflare R2.

### 2.3 ¿Por qué no todo en la VM?

| Opción | Pros | Contras |
|--------|------|---------|
| **Todo en VM** (PostgreSQL + uploads local) | Simple, todo junto | Si la VM muere, pierdes DB y archivos. Tú mantienes backups, actualizaciones, seguridad. |
| **Separado** (Neon + R2) | Datos seguros fuera de la VM. Backups automáticos. Menos mantenimiento. | Más servicios que configurar. Latencia adicional a DB externa. |

**Para DuoBalance beta pública, preferimos la opción separada.** El verdadero beneficio no es ahorrar RAM, sino reducir carga operativa y proteger los datos del usuario.

---

## 3. Configuración de entornos

### 3.1 Frontend (`DuoBalance-app`)

**Expo CLI carga `.env` según el comando:**
- `pnpm start` / `pnpm web` → **development** → lee `.env.development` + `.env`
- `pnpm export:web` / `pnpm build` → **production** → lee `.env.production` + `.env`

**Archivos commiteados:**

| Archivo | Contenido | Rama |
|---------|-----------|------|
| `.env.development` | `EXPO_PUBLIC_API_URL=http://localhost:3000` | `dev` |
| `.env.production` | `EXPO_PUBLIC_API_URL=https://api-duobalance.duckdns.org` | `main`, `dev` |
| `.env.example` | Plantilla genérica | `main`, `dev` |

**Archivo gitignored (overrides locales):**
- `.env` → valores personalizados del desarrollador (si necesitas probar contra otra API).

**Scripts en `package.json`:**
```json
{
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "export:web": "EXPO_PUBLIC_API_URL=https://api-duobalance.duckdns.org expo export -p web"
  }
}
```

---

### 3.2 Backend (`duobalance-api`)

**Archivos:**

| Archivo | Contenido | Estado |
|---------|-----------|--------|
| `.env.example` | Plantilla con todas las vars | ✅ Commit |
| `.env` | Secrets reales del desarrollador | ✅ Gitignored |

**Variables de entorno requeridas** (validadas por `src/config/env.config.ts`):

| Variable | Tipo | Descripción | Ejemplo dev | Ejemplo prod (Neon) |
|----------|------|-------------|-------------|---------------------|
| `PORT` | number | Puerto del servidor | `3000` | `3000` |
| `DATABASE_URL` | string (required) | Connection string Postgres | `postgresql://duobalance:pass@localhost:5432/duobalance` | `postgresql://duobalance:pass@ep-xxx.neon.tech/duobalance?sslmode=require` |
| `JWT_SECRET` | string (required) | Secreto para firmar JWT | `openssl rand -hex 32` | `openssl rand -hex 32` |
| `MAIL_PROVIDER` | string | Proveedor de email | `resend` o `brevo` | `resend` o `brevo` |
| `RESEND_API_KEY` | string (si resend) | API key de Resend | `re_xxxxxxxxxxxx` | `re_xxxxxxxxxxxx` |
| `BREVO_API_KEY` | string (si brevo) | API key de Brevo | `xkeysib-xxxxxxxxxxxx` | `xkeysib-xxxxxxxxxxxx` |
| `MAIL_FROM` | string | Email remitente | `onboarding@resend.dev` | `noreply@tudominio.com` |
| `FRONTEND_URL` | string | URL del frontend (para links de email) | `http://localhost:8081` | `https://duobalance.pages.dev` |
| `CORS_ORIGINS` | string | Orígenes permitidos (CSV) | `http://localhost:8081,http://localhost:8082` | `https://duobalance.pages.dev` |
| `R2_BUCKET_NAME` | string | Nombre del bucket R2 | `duobalance-dev` | `duobalance-prod` |
| `R2_ACCOUNT_ID` | string | Cloudflare Account ID | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_ACCESS_KEY_ID` | string | R2 access key | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_SECRET_ACCESS_KEY` | string | R2 secret key | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `R2_PUBLIC_URL` | string | URL pública del bucket R2 | `https://pub-xxx.r2.dev` | `https://pub-xxx.r2.dev` |

**Generar `JWT_SECRET` seguro:**
```bash
openssl rand -hex 32
```

---

## 4. Flujo de ramas (git)

### 4.1 Estrategia

| Rama | Propósito | Protección | Deploy |
|------|-----------|-----------|--------|
| `main` | **Producción estable** — solo deploys | Proteger contra commits directos | Deploy automático/manual |
| `dev` | **Integración continua** — trabajo diario | Proteger contra commits directos | No deploy |
| `feature/*` | Features individuales | Libre | Merge → `dev` vía PR |

**Flujo diario:**
```
feature/mi-cambio → PR → dev (CI: tsc + lint + build)
dev → PR → main (release tag) → deploy
```

### 4.2 Comandos básicos

```bash
# Empezar feature nueva
git checkout dev
git pull origin dev
git checkout -b feature/mi-cambio

# Trabajar, commitear, push
git add .
git commit -m "feat: descripción"
git push origin feature/mi-cambio

# PR a dev → CI valida → merge
# PR de dev a main → release → deploy
```

### 4.3 Diferencias entre ramas

**`main` solo tiene archivos de producción:**
- `.env.production`
- `.env.example`
- Código listo para deploy

**`dev` tiene archivos de desarrollo + producción:**
- `.env.development` (para `pnpm start` local)
- `.env.production` (para `pnpm export:web` local)
- `.env.example`
- Código en desarrollo

---

## 5. Modo desarrollo (local)

### 5.1 Setup inicial

**Backend:**
```bash
cd duobalance-api
cp .env.example .env
# Editar .env con tus secrets reales:
#   DATABASE_URL (Postgres local)
#   JWT_SECRET (openssl rand -hex 32)
#   RESEND_API_KEY o BREVO_API_KEY
#   MAIL_FROM
#   FRONTEND_URL=http://localhost:8081
#   CORS_ORIGINS=http://localhost:8081,http://localhost:8082

pnpm install --frozen-lockfile
npx prisma migrate dev
pnpm start:dev
```

**Frontend:**
```bash
cd DuoBalance-app
pnpm install --frozen-lockfile
pnpm web  # o pnpm start
```

**URLs locales:**
- Frontend: `http://localhost:8081`
- Backend API: `http://localhost:3000`
- API endpoints: `http://localhost:3000/expenses`, `/auth/login`, etc.

**Nota:** `.env.development` se carga automáticamente → apunta a `http://localhost:3000`.

---

## 6. Despliegue en producción (12 fases)

### FASE 1 — Preparar producción ✅ (completado)

**Backend:**
- [x] Variables de entorno documentadas en `.env.example`
- [x] CORS configurado vía `CORS_ORIGINS` (no hardcodeado)
- [x] `FRONTEND_URL` configurable
- [x] Validación con Joi en `src/config/env.config.ts`

**Frontend:**
- [x] `EXPO_PUBLIC_API_URL` en `.env.production`
- [x] `resolveImageUrl` usa `API_URL` (leído de `EXPO_PUBLIC_API_URL`)
- [x] Script `export:web` configurado
- [x] Archivos separados: `.env.development` (dev), `.env.production` (prod)

**Pendiente en FASE 1:**
- [x] Crear `ecosystem.config.js` para PM2
- [x] Crear `nginx.conf` de ejemplo
- [x] Crear endpoint `/health` (si no existe)
- [x] Agregar `CORS_ORIGINS` al schema Joi
- [ ] Integrar SDK de Cloudflare R2 para uploads
- [ ] Configurar variables de entorno de R2 en `.env.example`
- [ ] Verificar que `resolveImageUrl` funciona con URLs de R2

---

### FASE 2 — Oracle Cloud

**Objetivo:** Levantar Ubuntu VM con acceso público.

**Tareas:**
1. Crear cuenta en [Oracle Cloud](https://cloud.oracle.com/) (requiere tarjeta para verificación, pero no cobra).
2. Seleccionar **home region** (ej: us-ashburn-1, sa-santiago-1).
3. Intentar VM **ARM Ampere A1** (4 OCPU, 24 GB RAM, free).
   - Si no hay capacidad → usar 2 AMD VMs (1 OCPU, 1 GB RAM cada una).
4. Crear instancia Ubuntu 24.04 LTS.
5. **Reservar IP pública estática** (gratis) y adjuntar a la VM.
6. Configurar SSH:
   ```bash
   # Local
   ssh-keygen -t rsa -b 4096 -C "tu-email" -f ~/.ssh/oracle
   ssh-copy-id -i ~/.ssh/oracle.pub ubuntu@<IP_PUBLICA>
   ```
7. Configurar Security List (red):
   - Puerto 22 (SSH): solo tu IP
   - Puerto 80 (HTTP): 0.0.0.0/0
   - Puerto 443 (HTTPS): 0.0.0.0/0
8. Configurar firewall del SO (ufw):
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```
9. Crear **block volume** (persistente, gratis hasta 200 GB total).

---

### FASE 3 — PostgreSQL (Neon, gestión externa)

**Objetivo:** Base de datos PostgreSQL gestionada, con backups automáticos y sin mantenimiento manual.

**¿Por qué Neon en vez de PostgreSQL local?**
- Backups automáticos (sin configurar pg_dump)
- Si la VM muere, la DB sobrevive
- Sin necesidad de actualizar PostgreSQL manualmente
- Dashboard web para monitorear la DB
- Connection pooling incluido

**Tareas:**
1. Crear cuenta en [Neon](https://neon.tech/).
2. Crear un proyecto nuevo:
   - **Nombre:** `duobalance`
   - **Region:** la más cercana (us-east-2 si estás en Latam)
   - **PostgreSQL version:** 16+
3. Crear la database:
   - Neon crea una DB por defecto. Puedes usar esa o crear una nueva.
   - En el dashboard → SQL Editor → ejecutar:
   ```sql
   -- Neon crea el usuario y DB automáticamente al crear el proyecto
   -- Solo necesitas las credenciales del dashboard
   ```
4. Obtener la connection string:
   - Dashboard → Connection Details → PSSL Mode: Require
   - Copiar la connection string:
   ```
   postgresql://duobalance:password@ep-xxx.us-east-2.aws.neon.tech/duobalance?sslmode=require
   ```
5. Verificar conexión local:
   ```bash
   psql "postgresql://duobalance:password@ep-xxx.us-east-2.aws.neon.tech/duobalance?sslmode=require"
   ```
6. Configurar `DATABASE_URL` en la VM (`.env`):
   ```env
   DATABASE_URL=postgresql://duobalance:password@ep-xxx.us-east-2.aws.neon.tech/duobalance?sslmode=require
   ```

**⚠️ Consideraciones para Neon free tier:**
- Verificar límites actuales de conexiones, storage y compute
- Neon puede pausar la DB después de inactividad (verificar si aplica)
- La latencia desde la VM de Oracle (Bogotá/US) a Neon (US) es ~50-100ms adicional
- Para una app financiera con pocos usuarios, esto no debería ser problemático

**Alternativa: Supabase**
- Si Neon no cumple, [Supabase](https://supabase.com/) ofrece PostgreSQL managed gratis (500 MB storage)
- Incluye dashboard, auth, storage, y edge functions
- Más servicios, pero más complejo si solo necesitas la DB

---

### FASE 4 — Backend (NestJS)

**Tareas:**
1. Instalar Node.js 20:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
2. Instalar PM2 globalmente:
   ```bash
   sudo npm install -g pm2
   ```
3. Clonar repo (o subir código):
   ```bash
   cd /opt
   sudo git clone https://github.com/152004E/duobalance-api.git
   sudo chown -R ubuntu:ubuntu duobalance-api
   cd duobalance-api
   ```
4. Instalar dependencias:
   ```bash
   pnpm install --frozen-lockfile
   npx prisma generate
   ```
5. Crear `.env` en la VM (NO commitear):
   ```bash
   nano .env
   ```
   Contenido:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://duobalance:tu-password@ep-xxx.neon.tech/duobalance?sslmode=require
   JWT_SECRET=<openssl rand -hex 32>
   MAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxx
   MAIL_FROM=noreply@tudominio.com
   FRONTEND_URL=https://duobalance.pages.dev
   CORS_ORIGINS=https://duobalance.pages.dev
   R2_BUCKET_NAME=duobalance-prod
   R2_ACCOUNT_ID=tu-cloudflare-account-id
   R2_ACCESS_KEY_ID=tu-r2-access-key
   R2_SECRET_ACCESS_KEY=tu-r2-secret-key
   R2_PUBLIC_URL=https://pub-xxx.r2.dev
   ```
6. Crear `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [{
       name: 'duobalance-api',
       script: 'dist/main.js',
       instances: 1,
       exec_mode: 'fork',
       env: {
         NODE_ENV: 'production',
       },
     }],
   };
   ```
7. Compilar y arrancar:
   ```bash
   pnpm build
   pm2 start ecosystem.config.js
   pm2 startup  # genera comando para systemd
   pm2 save     # guarda estado actual
   ```
8. Probar API:
   ```bash
   curl http://localhost:3000
   ```

---

### FASE 5 — Nginx + HTTPS

**Tareas:**
1. Instalar Nginx:
   ```bash
   sudo apt install -y nginx
   ```
2. Instalar certbot:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```
3. Crear config Nginx (`/etc/nginx/sites-available/duobalance`):
   ```nginx
   server {
     listen 80;
     server_name api-duobalance.duckdns.org;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```
4. Activar:
   ```bash
   sudo ln -s /etc/nginx/sites-available/duobalance /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```
5. **⚠️ Importante:** agregar `client_max_body_size 6m;` para uploads de comprobantes (5MB):
   ```nginx
   server {
     client_max_body_size 6m;
     ...
   }
   ```
6. Configurar DuckDNS:
   - Crear cuenta en [duckdns.org](https://www.duckdns.org/)
   - Crear dominio `api-duobalance` → apuntar a la IP pública de Oracle
   - Actualizar cada 5 min (cron o script).
7. Obtener certificado HTTPS:
   ```bash
   sudo certbot --nginx -d api-duobalance.duckdns.org
   ```
8. Verificar renovación automática:
   ```bash
   sudo certbot renew --dry-run
   ```

---

### FASE 6 — Storage para uploads (Cloudflare R2)

**Objetivo:** Comprobantes y avatares almacenados en object storage externo, separados de la VM.

**¿Por qué R2 en vez de block volume en la VM?**
- Si la VM muere o se recrea, los archivos sobreviven
- Sin necesidad de montar/formatear discos
- Sin límite de IOPS o rendimiento de disco
- Sin costo de egress (a diferencia de S3)
- Acceso directo via URL pública (para servir imágenes)
- 10 GB gratis en el free tier

**Tareas:**
1. Crear cuenta en [Cloudflare](https://dash.cloudflare.com/) (si no la tienes).
2. Ir a **R2 Object Storage → Create bucket**:
   - **Nombre:** `duobalance-prod` (o `duobalance-dev` para desarrollo)
   - **Location:** auto (o la más cercana)
3. Configurar acceso:
   - **R2 → Manage R2 API Tokens → Create API Token**
   - Permisos: `Object Read & Write`
   - Scope: al bucket `duobalance-prod`
   - Copiar **Access Key ID** y **Secret Access Key**
4. Configurar acceso público (para servir imágenes):
   - **R2 → duobalance-prod → Settings → Public Access**
   - Habilitar **R2.dev subdomain** (gratis) o conectar dominio propio
   - Copiar la URL pública (ej: `https://pub-xxx.r2.dev` o `https://duobalance-media.duckdns.org`)
5. Configurar variables en la VM (`.env`):
   ```env
   R2_BUCKET_NAME=duobalance-prod
   R2_ACCOUNT_ID=tu-cloudflare-account-id
   R2_ACCESS_KEY_ID=tu-r2-access-key
   R2_SECRET_ACCESS_KEY=tu-r2-secret-key
   R2_PUBLIC_URL=https://pub-xxx.r2.dev
   ```
6. **En el código de NestJS**, cambiar el servicio de uploads para usar R2 en vez de `fs.writeFile`:
   ```typescript
   // Usar @aws-sdk/client-s3 con R2 endpoint
   // o paquete específico de Cloudflare R2
   ```
7. Estructura del bucket:
   ```
   duobalance-prod/
   ├── receipts/          # Comprobantes de gastos
   │   ├── {userId}/
   │   │   ├── {expenseId}/
   │   │   │   └── receipt.jpg
   ├── avatars/           # Fotos de perfil
   │   └── {userId}/
   │       └── avatar.jpg
   ```
8. Probar:
   ```bash
   # Subir un comprobante desde el frontend
   # Verificar que la imagen carga desde R2 (no desde la VM)
   # Verificar que la URL de la imagen es pública
   ```

**⚠️ Seguridad:**
- No exponer las API keys de R2 en el frontend
- Las API keys solo se usan en el backend (NestJS)
- El bucket público solo sirve archivos, no permite escritura externa
- Configurar CORS en R2 si el frontend carga imágenes directamente

---

### FASE 7 — Cloudflare Pages (frontend)

**Tareas:**
1. Crear cuenta en [Cloudflare](https://dash.cloudflare.com/).
2. Ir a **Workers & Pages → Create application → Pages**.
3. Conectar repo GitHub: `152004E/DuoBalance-app`.
4. Configurar build:
   - **Build command:** `pnpm install --frozen-lockfile && pnpm export:web`
   - **Build output directory:** `dist`
   - **Root directory:** `/`
   - **Environment variables (Production):**
     ```
     EXPO_PUBLIC_API_URL=https://api-duobalance.duckdns.org
     EXPO_PUBLIC_APP_NAME=DuoBalance
     ```
5. **Environment variables (Preview):** mismas variables (para previews de PRs).
6. Deploy → Cloudflare asigna `duobalance.pages.dev` (gratis, HTTPS auto).
7. Probar acceso: `https://duobalance.pages.dev`.

---

### FASE 8 — Conectar frontend + backend

**Objetivo:** Verificar end-to-end en producción.

**Checklist:**
- [ ] Registro de usuario nuevo
- [ ] Email de verificación llega
- [ ] Link de verificación abre `https://duobalance.pages.dev/verify-email?token=...`
- [ ] Login funciona
- [ ] Crear grupo/pareja
- [ ] Registrar gasto
- [ ] Subir comprobante → imagen carga desde `https://api-duobalance.duckdns.org/uploads/...`
- [ ] Balance se calcula correctamente
- [ ] Reportes muestran datos
- [ ] Logout
- [ ] Forgot password → email llega → link funciona

**⚠️ Validar:**
- CORS funciona (no hay errores de "blocked by CORS policy" en consola del navegador).
- URLs de uploads resuelven correctamente (comprobantes y avatares cargan).
- Links de email apuntan al dominio real (`https://duobalance.pages.dev`).

---

### FASE 9 — Backups

**Objetivo:** Poder recuperar la DB si algo falla.

**Tareas:**
1. Script de backup (`/opt/scripts/backup-db.sh`):
   ```bash
   #!/bin/bash
   TIMESTAMP=$(date +%Y%m%d_%H%M%S)
   BACKUP_DIR="/opt/backups/db"
   mkdir -p $BACKUP_DIR
   
   pg_dump -U duobalance -d duobalance | gzip > $BACKUP_DIR/duobalance_$TIMESTAMP.sql.gz
   
   # Subir a Oracle Object Storage (gratis 10GB)
   # O descargar localmente
   ```
2. Hacer ejecutable:
   ```bash
   chmod +x /opt/scripts/backup-db.sh
   ```
3. Cron diario (3 AM):
   ```bash
   crontab -e
   0 3 * * * /opt/scripts/backup-db.sh
   ```
4. **Probar restauración:**
   ```bash
   # Crear DB de prueba
   createdb duobalance_test
   # Restaurar
   gunzip -c backup.sql.gz | psql -U duobalance -d duobalance_test
   # Verificar datos
   psql -U duobalance -d duobalance_test -c "SELECT COUNT(*) FROM \"Expense\";"
   ```

**⚠️ Importante:** Backup en la misma VM no sirve si la VM muere → idealmente subir a Object Storage o descargar fuera.

---

### FASE 10 — Monitorización básica

**Objetivo:** Saber si la API está caída.

**Tareas:**
1. **PM2 monitoring:**
   ```bash
   pm2 status
   pm2 logs
   pm2 monit  # UI en terminal
   ```
2. **Health check endpoint** (agregar en NestJS):
   ```typescript
   @Get('health')
   healthCheck() {
     return { status: 'ok', timestamp: new Date().toISOString() };
   }
   ```
3. **Cron check** (`/etc/cron.d/api-health`):
   ```bash
   */5 * * * * curl -f https://api-duobalance.duckdns.org/health || echo "API DOWN" >> /var/log/api-health.log
   ```
4. **Nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```
5. **Neon dashboard:**
   - Monitoreo de conexiones, queries, storage en [console.neon.tech](https://console.neon.tech)
   - No hay logs de Postgres en la VM (la DB es externa)

---

### FASE 11 — Android (post-web)

**Estado:** Diferido. La beta es **solo web** por ahora.

**Cuándo hacerlo:**
- Cuando web + API estén estables.
- Cuando se quiera probar en dispositivo físico.

**Tareas (futuras):**
1. Configurar `android.package` en `app.json`:
   ```json
   {
     "expo": {
       "android": {
         "package": "com.duobalance.app"
       }
     }
   }
   ```
2. Instalar EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
3. Login:
   ```bash
   eas login
   ```
4. Build APK:
   ```bash
   cd DuoBalance-app
   eas build --platform android --profile preview
   ```
5. El APK consumirá `EXPO_PUBLIC_API_URL` (ya configurado en `.env.production`).

---

### FASE 12 — Prueba end-to-end de producción

**Objetivo:** Validar flujo completo antes de abrir beta.

**Checklist:**
1. Abrir `https://duobalance.pages.dev` en navegador.
2. Registrar usuario nuevo.
3. Verificar email → click link → cuenta verificada.
4. Login.
5. Crear pareja.
6. Registrar gasto con comprobante (subir imagen).
7. Verificar que el comprobante carga correctamente.
8. Revisar balance, reportes.
9. Logout.
10. Probar forgot password.
11. (Si hay APK Android) Probar mismo flujo desde APK.

---

## 7. Resumen de comandos clave

### Backend (producción)
```bash
# Instalar
pnpm install --frozen-lockfile
npx prisma generate
npx prisma migrate deploy

# Compilar
pnpm build

# Arrancar
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Logs
pm2 logs

# Reiniciar
pm2 restart duobalance-api
```

### Frontend (producción)
```bash
# Build
pnpm export:web

# Resultado: dist/ listo para subir a Cloudflare Pages
```

---

## 8. Troubleshooting

### Problema: uploads no cargan en producción
**Causa:** R2 no está configurado o las API keys son incorrectas.
**Solución:**
- Verificar variables de R2 en `.env` de la VM
- Verificar que el bucket R2 existe y tiene permisos públicos de lectura
- Verificar que el código usa R2 en vez de `fs.writeFile` local
- Verificar Nginx: `client_max_body_size 6m;`

### Problema: CORS error en navegador
**Causa:** `CORS_ORIGINS` no incluye el dominio de Cloudflare Pages.
**Solución:**
- Verificar `.env` en VM: `CORS_ORIGINS=https://duobalance.pages.dev`
- Reiniciar PM2: `pm2 restart duobalance-api`

### Problema: links de email apuntan a localhost
**Causa:** `FRONTEND_URL` no configurado para producción.
**Solución:**
- Verificar `.env` en VM: `FRONTEND_URL=https://duobalance.pages.dev`

### Problema: API no arranca después de reinicio VM
**Causa:** PM2 no está configurado para arrancar al boot.
**Solución:**
```bash
pm2 startup  # muestra comando para systemd
pm2 save
```

### Problema: Neon DB no responde / timeout de conexión
**Causa:** Neon free tier puede pausar la DB tras inactividad, o la conexión string es incorrecta.
**Solución:**
- Verificar `DATABASE_URL` en `.env`
- Verificar que `sslmode=require` está en la connection string
- Neon free tier: revisar si la DB está pausada (abrir dashboard para reactivar)
- Verificar que Neon no está en mantenimiento

### Problema: Imágenes de R2 no cargan (CORS)
**Causa:** R2 bucket no tiene CORS configurado para el dominio del frontend.
**Solución:**
- Ir a R2 → bucket → Settings → CORS Policy
- Agregar regla para `https://duobalance.pages.dev` con métodos GET, HEAD

### Problema: certificado SSL no renueva
**Causa:** DuckDNS IP no apunta a la VM.
**Solución:**
- Actualizar DuckDNS IP manualmente o con cron.
- Verificar: `nslookup api-duobalance.duckdns.org`

---

## 9. Referencias

- [Expo CLI — Environment variables](https://docs.expo.dev/guides/environment-variables/)
- [NestJS — Configuration](https://docs.nestjs.com/techniques/configuration)
- [Oracle Cloud Always Free](https://www.oracle.com/cloud/free/)
- [Neon — Serverless Postgres](https://neon.tech/)
- [Cloudflare R2 — Object Storage](https://developers.cloudflare.com/r2/)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [PM2 — Quick Start](https://pm2.keymetrics.io/docs/quick-start/)
- [Let's Encrypt — Certbot](https://certbot.eff.org/)
- [DuckDNS](https://www.duckdns.org/)
- [AWS SDK S3 (compatible con R2)](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-creating-buckets.html)

---

## 10. Verificar antes de desplegar

Antes de crear cuentas en Oracle/Neon/Cloudflare, verificar los tiers gratuitos actuales:

| Servicio | Qué verificar | URL |
|----------|---------------|-----|
| Oracle Always Free | Límites de VM, storage, transferencia | [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) |
| Neon Free Tier | Límites de conexiones, storage, compute, pausa por inactividad | [neon.tech/pricing](https://neon.tech/pricing) |
| Cloudflare R2 Free Tier | Límites de storage, requests, egress | [developers.cloudflare.com/r2/pricing](https://developers.cloudflare.com/r2/pricing/) |
| Cloudflare Pages Free | Límites de builds, bandwidth | [developers.cloudflare.com/pages/platform/limits](https://developers.cloudflare.com/pages/platform/limits/) |

**⚠️ Los límites gratuitos pueden cambiar sin previo aviso.** Verificar antes de cada despliegue.

---

**Última actualización:** 2026-08-20