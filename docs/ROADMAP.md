# Roadmap — Backend Release Phases

## Phase 0: Foundation (v0.1) — Done
**Goal**: Working backend scaffold with database
- [✓] NestJS + Prisma + PostgreSQL setup
- [✓] User model migration
- [✓] Basic health endpoint
- [✓] Test infrastructure
- [✓] PrismaService module
- [✓] Global pipes + filters

**Estimated**: Complete

---

## Phase 1: Auth & Couples (v0.2) — Done
**Goal**: Users can register, log in, and link as a couple
- [✓] Auth (register, login, JWT, profile)
- [✓] Couple creation + invitation codes
- [✓] Join + leave couple

**Estimated**: Complete

---

## Phase 2: Core Expense Tracking (v0.3) — Done
**Goal**: Expense CRUD and split logic
- [✓] Expense CRUD (create, list with filters, get one, update via PartialType, soft-delete)
- [✓] Category + date + amount range filtering
- [✓] Soft-delete (`deletedAt` en Expense únicamente)
- [❌] Equal/percentage/custom splitting (pendiente)
- [❌] Tests for expense logic (pendiente)

> ⚠️ **Soft-delete:** Solo `Expense` usa `deletedAt`. `User` y `Couple` se eliminan realmente (no tienen soft-delete).

**Estimated**: Complete (CRUD), splitting & tests pending

---

## Phase 3: Balances & Dashboard (v0.4) — Partial
**Goal**: Balance aggregation and insights
- [✓] Balance aggregation engine (EQUAL split, soft-delete filter)
- [❌] Dashboard with summaries
- [❌] Settlement suggestions
- [❌] PERCENTAGE / CUSTOM split support

> Balance endpoint `GET /balances` implementado. Solo EQUAL.

**Estimated**: Balance done, dashboard pending

---

## Phase 4: Receipt Scanning (v0.5)
**Goal**: Receipt upload and OCR processing
- Multipart receipt upload
- S3/cloud storage
- OCR pipeline integration
- Auto-fill expenses from receipt data

**Estimated**: 3-4 weeks

---

## Phase 5: Payments & Settlement (v0.6)
**Goal**: Payment recording and settlement
- Payment recording
- Payment history
- Settlement calculation

**Estimated**: 2 weeks

---

## Phase 6: Production Readiness (v1.0)
**Goal**: API is stable, secure, and production-ready
- Push notifications
- CI/CD (GitHub Actions)
- Error monitoring (Sentry)
- Performance optimization

**Estimated**: 4-6 weeks

---

## Phase 7: Post-Launch (v1.x)
**Goal**: Iterate based on feedback
- Recurring expenses
- Budget limits
- Export to CSV/PDF
- Split reminders
- Group expenses (3+ people)

**Estimated**: Ongoing

---

## Timeline

```
v0.1  ████████████████████████████████  (Foundation — done)
v0.2  ████████████████████████████████  (Auth & Couples — done)
v0.3  ████████████████████████████░░░░  (Expenses CRUD — done, splitting pending)
v0.4  ████████████████████░░░░░░░░░░░░  (Balances EQUAL — done, dashboard pending)
v0.5  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  (Receipts)
v0.6  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░██  (Payments)
v1.0  ████████████████████████████████  (Production)
```

**Total estimated time to v1.0**: 16-22 weeks
