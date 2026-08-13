# Plan — What's Left to Implement (Backend)

> **Nota:** El despliegue en Supabase, Render o cualquier servicio en la nube ocurre ÚNICAMENTE cuando el proyecto alcance estado beta. Hasta entonces todo corre en localhost.

## Legend
- ✓ Done
- ❌ Not Started

## Phase 1: Foundation (Current — Partial)
- [✓] NestJS scaffold with CLI
- [✓] Prisma + PostgreSQL setup
- [✓] User model + migration
- [✓] Basic controller (GET /)
- [✓] Unit + e2e test setup
- [✓] ESLint + Prettier config
- [✓] PrismaService module (wrap PrismaClient for DI)
- [✓] Global validation pipe (whitelist + forbidNonWhitelisted + transform)
- [✓] Global exception filter (consistent JSON error response)
- [✓] Environment validation (Joi schema for PORT, DATABASE_URL, JWT_SECRET)

## Phase 2: Auth
- [✓] Auth module (register, login)
- [✓] JWT strategy + guard (Passport, Bearer token)
- [✓] bcrypt password hashing
- [✓] DTOs (register.dto, login.dto with class-validator)
- [✓] Refresh token rotation and management (`POST /auth/refresh`, `POST /auth/logout`)
- [✓] Profile update (`PATCH /auth/profile` — firstName, lastName, email)
- [✓] Avatar upload (`POST /auth/profile/avatar` — static file serving)
- [❌] Rate limiting on login
- [✓] Tests for auth endpoints (auth.controller.spec.ts, auth.service.spec.ts, refresh-token.service.spec.ts)
- [✓] Change password (`PATCH /auth/password` — JWT-protected, verifies current password, hashes new one)

## Phase 3: Group Management (migrated from Couples)
- [✓] Group model + migration (replaces Couple)
- [✓] GroupMember model + migration (replaces User.coupleId)
- [✓] Create group endpoint
- [✓] Join group via invitation code
- [✓] List my groups
- [✓] Get group details + members
- [✓] Leave group
- [✓] GroupType support (PERSONAL, COUPLE, GROUP)
- [✓] MemberRole support (OWNER, ADMIN, MEMBER)
- [✓] Update group (`PATCH /groups/:id`)
- [✓] Delete group (`DELETE /groups/:id`)
- [✓] Archive group (`POST /groups/:id/archive`)
- [✓] Regenerate invite code (`POST /groups/:id/regenerate-invite`)
- [✓] Remove member (`DELETE /groups/:id/members/:memberId`)
- [✓] Update member split percentage (`PATCH /groups/:id/members/:memberId/split`)
- [✓] splitPercentage field on GroupMember model
- [✓] Tests (groups.controller.spec.ts, groups.service.spec.ts)

## Phase 4: Expenses
- [✓] Expense model + migration
- [✓] Expense CRUD endpoints (POST, GET, GET/:id, PATCH/:id, DELETE/:id)
- [✓] Soft-delete (solo Expense — `deletedAt`)
- [✓] Category filtering + date range + amount range (QueryExpenseDto)
- [✓] Split calculation logic (EQUAL + PERCENTAGE)
- [✓] Tests (expenses.controller.spec.ts, expenses.service.spec.ts)

> ⚠️ **Soft-delete:** Solo `Expense` usa `deletedAt`. `User` y `Group` se eliminan realmente (no tienen soft-delete).

## Phase 5: Balances & Dashboard
- [✓] Balance aggregation endpoint (EQUAL + PERCENTAGE split, soft-delete filter, memberCount-aware)
- [✓] Dashboard summary (totals, categories, trends)
- [✓] Tests (balances.service.spec.ts, dashboard.service.spec.ts)
- [❌] CUSTOM split support

## Phase 6: Receipts
- [❌] Receipt upload endpoint (multipart)
- [❌] S3/cloud storage integration
- [❌] OCR pipeline (extract amount, merchant, items)
- [❌] Auto-fill expense from receipt

## Phase 7: Payments & Settlements
- [✓] Payment model + migration (groupId-based)
- [✓] Record payment endpoint
- [✓] Payment history
- [✓] Settlement calculation endpoint
- [✓] Settlement suggestions endpoint (greedy algorithm, `GET /settlements/suggestions?groupId=optional`)
- [✓] `calculateExpenseShare()` memberCount support (was hardcoded `/2` for couples)
- [✓] Tests (payments.controller.spec.ts, payments.service.spec.ts, settlements.service.spec.ts)

## Phase 8: Mail Module (Resend) — MVP Correos

> **Decisión de arquitectura:** ningún módulo envía correos directamente. Todo pasa por `MailService` (único `MailModule`). Cambiar de proveedor (Resend → Brevo/otro) solo toca `src/mail/providers/`.

**Cuenta:** `doubalanceinfo@gmail.com` (crear en [resend.com](https://resend.com) → API Key). Sin comprar dominio todavía.

**Correos del MVP (solo estos 4):**
1. Verificación de correo al registrarse
2. Bienvenida
3. Liquidación mensual (cada mes — resumen de balances/liquidaciones pendientes)
4. Forgot password

### Sprint 1 — Base: MailModule + Resend
- [ ] Crear cuenta Resend con `doubalanceinfo@gmail.com` → API Key (`RESEND_API_KEY`)
- [ ] `pnpm add resend`
- [ ] Crear estructura `src/mail/`:
  ```
  src/mail/
  ├── mail.module.ts          ← exporta MailService (global)
  ├── mail.service.ts         ← mailService.send(...) — única puerta de salida
  ├── providers/
  │   └── resend.provider.ts  ← único archivo que importa el SDK 'resend'
  ├── templates/              ← HTML con {{variables}}, sin HTML en código
  │   ├── welcome.html
  │   ├── verification.html
  │   ├── forgot-password.html
  │   └── monthly-settlement.html
  └── interfaces/
      └── mail.interface.ts   ← MailPayload { to, subject, template, data }
  ```
- [ ] Env vars (`.env` + Joi en `env.config.ts`):
  - `RESEND_API_KEY=...`
  - `MAIL_FROM=onboarding@resend.dev` (remitente temporal de Resend; al tener dominio propio solo se cambia este valor)
  - `FRONTEND_URL=http://localhost:8081`
- [ ] Endpoint temporal `POST /mail/test` → "Hola {{name}}, DuoBalance quedó configurado correctamente"
- [ ] Verificar recepción en el inbox → **eliminar endpoint**

### Sprint 2 — Forgot Password
- [ ] Prisma: modelo `PasswordResetToken` (tokenHash único, userId, expiresAt, usedAt) + migración
- [ ] `POST /auth/forgot-password` `{ email }` → genera token (1h), guarda hash, `mailService.sendForgotPassword()` con link `FRONTEND_URL/reset-password?token=...`
- [ ] `POST /auth/reset-password` `{ token, newPassword }` → valida token (vigente, sin usar) → actualiza hash → revoca token + refresh tokens
- [ ] Seguridad: mismo mensaje de respuesta si el email no existe (evitar enumeración de usuarios)
- [ ] Frontend: conectar `forgot-password.tsx` (ya tiene UI) + nueva pantalla `reset-password.tsx`

### Sprint 3 — Verificación de correo + Bienvenida
- [x] Prisma: `User.emailVerifiedAt DateTime?` + modelo `EmailVerificationToken` + migración `20260813191657_add_email_verification`
- [x] Al registrarse: crear token de verificación (24h, SHA-256 en `EmailVerificationService`) y un **correo combinado** `sendWelcomeAndVerification()` (template `welcome.html` con botón "Confirmar tu correo" → `FRONTEND_URL/verify-email?token=...`)
- [x] `POST /auth/verify-email` `{ token }` → valida token (vigente, sin usar), marca `emailVerifiedAt = now()` y revoca el token
- [x] `POST /auth/resend-verification` `{ email }` → reenvía el correo (respuesta genérica para no enumerar usuarios)
- [x] **Decisión de producto: verificación ESTRICTA** — `register` **no** auto-login; `login` bloquea con `ForbiddenException` si `emailVerifiedAt` es null (el cliente muestra banner/pantalla "verifica tu correo")
- [x] **Nota**: el envío de mail va en `try/catch` — si falta `RESEND_API_KEY` el registro/verificación no fallan (solo log warn)

### Sprint 4 — Liquidación mensual
- [ ] `pnpm add @nestjs/schedule` + `ScheduleModule.forRoot()` en AppModule
- [ ] Cron mensual: agrupar balances/liquidaciones pendientes por usuario → `mailService.sendMonthlySettlement()` (resumen "Debes X a Y / Te deben X")

### Fuera de alcance (post-MVP, no hacer todavía)
- [ ] Invitaciones a parejas/grupos (`mailService.sendInvitation`)
- [ ] Compra de dominio verificado, Google Workspace, SMTP custom
- [ ] Notificaciones push, emails de marketing, newsletters

## Phase 9: Polish
- [❌] Push notifications
- [❌] Performance optimization

## Phase 10: Deployment — Beta
> Todo el desarrollo previo corre en localhost. Solo al llegar a beta se despliega.
- [❌] Crear proyecto Supabase (PostgreSQL + Storage plan gratis)
- [❌] Configurar Prisma con conexión a Supabase PostgreSQL
- [❌] Configurar Supabase Storage para comprobantes
- [❌] Desplegar backend en Render (o Railway/Fly.io)
- [❌] Configurar CI/CD (GitHub Actions)
- [❌] Configurar dominio/URL pública
