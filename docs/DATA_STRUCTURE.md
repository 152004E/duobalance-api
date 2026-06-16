# Data Structures — Database Models & API DTOs

## Database Models (Prisma Schema)

### User (current)
```prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  createdAt DateTime @default(now())

  coupleId  String?
  couple    Couple?  @relation(fields: [coupleId], references: [id])

  expenses  Expense[]
}
```

### Couple (current)
```prisma
model Couple {
  id         String   @id @default(uuid())
  inviteCode String   @unique
  createdAt  DateTime @default(now())

  users      User[]
  expenses   Expense[]
}
```

### Expense (implemented ✓)
```prisma
model Expense {
  id          String           @id @default(uuid())
  description String
  amount      Decimal          @db.Decimal(12,2)
  category    ExpenseCategory
  splitType   SplitType
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt
  deletedAt   DateTime?

  paidById    String
  paidBy      User             @relation(fields: [paidById], references: [id])
  coupleId    String
  couple      Couple           @relation(fields: [coupleId], references: [id])
}
```

> **Soft-delete:** Solo `Expense` usa `deletedAt`. `User` y `Couple` se eliminan realmente (no tienen soft-delete).

### Payment (implemented ✓)

```prisma
model Payment {
  id          String   @id @default(uuid())
  amount      Decimal  @db.Decimal(12,2)
  fromId      String
  from        User     @relation("Payer")
  toId        String
  to          User     @relation("Payee")
  coupleId    String
  couple      Couple   @relation("Payments")
  createdAt   DateTime @default(now())
}
```

### Enums
```prisma
enum ExpenseCategory {
  FOOD
  TRANSPORT
  RENT
  SERVICES
  ENTERTAINMENT
  OTHER
}

enum SplitType {
  EQUAL
  PERCENTAGE
  CUSTOM
  PERSONAL
}
```

## API DTOs (Request)

```typescript
// Auth
class RegisterDto {
  name: string;
  email: string;
  password: string;
}

class LoginDto {
  email: string;
  password: string;
}

// Expense — Create
class CreateExpenseDto {
  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsEnum(SplitType)
  splitType: SplitType;
}

// Expense — Update (all optional via PartialType)
class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

// Expense — Query filters (all optional)
class QueryExpenseDto {
  category?: ExpenseCategory;
  splitType?: SplitType;
  startDate?: string;     // ISO date string
  endDate?: string;       // ISO date string
  minAmount?: number;
  maxAmount?: number;
}

// Balance
class BalanceResponse {
  totalExpenses: number;
  totalPaidByMe: number;
  totalPaidByPartner: number;
  myShare: number;
  partnerShare: number;
  balance: number;          // Math.abs(netBalance)
  direction: 'OWED_TO_ME' | 'I_OWE' | 'SETTLED';
}

// Payment — Create
class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsUUID()
  toUserId: string;
}
```

## API Response Types

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  };
}

interface ExpenseResponse {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  splitType: SplitType;
  paidBy: { id: string; name: string; email: string };
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface BalanceResponse {
  totalExpenses: number;
  totalPaidByMe: number;
  totalPaidByPartner: number;
  myShare: number;
  partnerShare: number;
  balance: number;
  direction: 'OWED_TO_ME' | 'I_OWE' | 'SETTLED';
}

interface PaymentResponse {
  id: string;
  amount: number;
  createdAt: Date;
  fromUserId: string;
  toUserId: string;
  coupleId: string;
  fromUser?: { id: string; name: string };
  toUser?: { id: string; name: string };
}

// Settlement
interface SettlementResponse {
  totalExpenses: number;
  totalPaidByMe: number;
  totalPaidByPartner: number;
  myShare: number;
  partnerShare: number;
  balanceAmount: number;
  balanceDirection: 'OWED_TO_ME' | 'I_OWE' | 'SETTLED';
  paymentsMade: number;
  paymentsReceived: number;
  netSettlement: number;
  settlementDirection: 'OWED_TO_ME' | 'I_OWE' | 'SETTLED';
}

interface ReceiptUploadResponse {
  id: string;
  url: string;
  processed: boolean;
  extractedData?: {
    amount: number;
    date: string;
    merchant: string;
    items: string[];
  };
}
```
