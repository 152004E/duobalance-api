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

## Phase 1: Auth & Groups (v0.2) — Done
**Goal**: Users can register, log in, and form groups
- [✓] Auth (register, login, JWT, profile, refresh token, logout, profile update, avatar upload, password change)
- [✓] Group creation + invitation codes (6 hex chars)
- [✓] Join + leave group + update + delete + archive + regenerate invite + manage members (GroupType: PERSONAL, COUPLE, GROUP)

**Estimated**: Complete

---

## Phase 2: Core Expense Tracking (v0.3) — Done
**Goal**: Expense CRUD and split logic
- [✓] Expense CRUD (create, list with filters, get one, update via PartialType, soft-delete)
- [✓] Category + date + amount range filtering
- [✓] Soft-delete (`deletedAt` en Expense únicamente)
- [✓] Split types: EQUAL + PERCENTAGE (con ExpenseSplit model)
- [✓] Tests for expense logic (expenses.controller.spec.ts, expenses.service.spec.ts)

> ⚠️ **Soft-delete:** Solo `Expense` usa `deletedAt`. `User` y `Group` se eliminan realmente (no tienen soft-delete).

**Estimated**: Complete (CRUD), splitting & tests pending

---

## Phase 3: Balances & Dashboard + Settlement (v0.4) — Done
**Goal**: Balance aggregation, insights, and settlement suggestions
- [✓] Balance aggregation engine (EQUAL + PERCENTAGE split, soft-delete filter, memberCount-aware)
- [✓] Dashboard with summaries
- [✓] Settlement suggestions (greedy algorithm, `GET /settlements/suggestions`)
- [❌] CUSTOM split support

> Dashboard endpoint `GET /dashboard` implementado. Balances soportan EQUAL + PERCENTAGE. Settlement suggestions implementadas con algoritmo greedy.

**Estimated**: Complete

---

## Phase 4: Receipt Scanning (v0.5)
**Goal**: Receipt upload and OCR processing
- Multipart receipt upload
- S3/cloud storage
- OCR pipeline integration
- Auto-fill expenses from receipt data

**Estimated**: 3-4 weeks

---

## Phase 5: Payments & Settlement (v0.6) — Done
**Goal**: Payment recording and net settlement
- [✓] Payment recording
- [✓] Payment history
- [✓] Net settlement calculation

> Payment endpoint `POST /payments` y `GET /payments` implementados. Settlement endpoint `GET /settlements` implementado.

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
v0.2  ████████████████████████████████  (Auth & Groups including refresh, profile, avatar — done)
v0.3  ██████████████████████████████████  (Expenses CRUD + EQUAL/PERCENTAGE + tests — done)
v0.4  ██████████████████████████████████  (Balances + Dashboard + Settlement Suggestions — done)
v0.5  ██████████████████████████████████  (Payments + Settlement + Groups full CRUD — done)
v0.6  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (Receipts)
v1.0  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (Production)
```

**Total estimated time to v1.0**: 16-22 weeks
