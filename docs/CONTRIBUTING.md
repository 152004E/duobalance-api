# Contributing to duobalance-api

## Getting Started

```bash
git clone <repo-url>
cd duobalance-api
pnpm install
npx prisma generate
npx prisma migrate dev
pnpm start:dev
```

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/description
   ```

2. **Make changes** following the conventions in `AI_RULES.md`

3. **Run tests**:
   ```bash
   pnpm test           # Unit tests
   pnpm test:e2e       # E2E tests
   pnpm lint           # Lint check
   ```

4. **Commit** with conventional commit format:
   ```
   feat: add expense CRUD endpoints
   fix: correct balance calculation for uneven splits
   chore: update Prisma to v7
   ```

5. **Push and create a PR** to `main`

## Code Review Checklist
- [ ] Follows NestJS module conventions
- [ ] Has corresponding tests (unit + e2e where applicable)
- [ ] DTOs validated with class-validator
- [ ] No `any` types
- [ ] Passes `pnpm lint` and `pnpm format`
- [ ] All tests pass
- [ ] Migration is included for schema changes
- [ ] `.env.example` updated if new env vars added

## Standards
- **TypeScript** strict mode
- **No `export default`** — always named exports
- **Async/await** over `.then()`
- **Prisma** for all database access
- **JWT + bcrypt** for authentication
- **pnpm** as package manager

## Project Structure
```
duobalance-api/
├── src/
│   ├── {feature}/
│   │   ├── {feature}.module.ts
│   │   ├── {feature}.controller.ts
│   │   ├── {feature}.service.ts
│   │   ├── dto/
│   │   └── interfaces/
│   ├── common/
│   │   ├── guards/
│   │   ├── filters/
│   │   └── pipes/
│   └── prisma/
│       └── prisma.service.ts
├── prisma/
│   └── schema.prisma
└── test/
    └── *.e2e-spec.ts
```

## Need Help?
Check `docs/` directory for detailed documentation.
