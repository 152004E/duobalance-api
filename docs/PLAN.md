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

## Phase 8: Polish
- [❌] Push notifications
- [❌] Performance optimization

## Phase 9: Deployment — Beta
> Todo el desarrollo previo corre en localhost. Solo al llegar a beta se despliega.
- [❌] Crear proyecto Supabase (PostgreSQL + Storage plan gratis)
- [❌] Configurar Prisma con conexión a Supabase PostgreSQL
- [❌] Configurar Supabase Storage para comprobantes
- [❌] Desplegar backend en Render (o Railway/Fly.io)
- [❌] Configurar CI/CD (GitHub Actions)
- [❌] Configurar dominio/URL pública
