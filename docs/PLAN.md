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
- [❌] PrismaService module (wrap PrismaClient for DI)
- [❌] Global validation pipe
- [❌] Global exception filter
- [❌] Environment validation (Joi/Zod for .env)

## Phase 2: Auth
- [❌] Auth module (register, login, refresh)
- [❌] JWT strategy + guard
- [❌] bcrypt password hashing
- [❌] Rate limiting on login
- [❌] Tests for auth endpoints

## Phase 3: Couple Management
- [❌] Couple model + migration
- [❌] Create couple endpoint
- [❌] Join couple via invitation code
- [❌] Get couple balance
- [❌] Link/unlink from couple

## Phase 4: Expenses
- [❌] Expense model + migration
- [❌] Expense CRUD endpoints
- [❌] Split calculation logic (equal/percentage/custom)
- [❌] Category filtering + pagination
- [❌] Tests for expense logic

## Phase 5: Balances & Dashboard
- [❌] Balance aggregation endpoint
- [❌] Dashboard summary (totals, trends)
- [❌] Settlement suggestions

## Phase 6: Receipts
- [❌] Receipt upload endpoint (multipart)
- [❌] S3/cloud storage integration
- [❌] OCR pipeline (extract amount, merchant, items)
- [❌] Auto-fill expense from receipt

## Phase 7: Payments
- [❌] Payment model + migration
- [❌] Record payment endpoint
- [❌] Payment history
- [❌] Settlement calculation (who owes whom)

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
