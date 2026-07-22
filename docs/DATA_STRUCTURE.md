# Data Structures — Database Models & API DTOs

## Database Models (Prisma Schema)

### User (current)
```prisma
model User {
  id        String   @id @default(uuid())
  firstName String
  lastName  String
  email     String   @unique
  password  String
  avatarUrl String?
  createdAt DateTime @default(now())

  members           GroupMember[]
  expenses          Expense[]
  expenseSplits     ExpenseSplit[]
  paymentsSent      Payment[] @relation("SentPayments")
  paymentsReceived  Payment[] @relation("ReceivedPayments")
  refreshTokens     RefreshToken[]
}
```

### Group (current)
```prisma
model Group {
  id         String    @id @default(uuid())
  name       String
  type       GroupType @default(COUPLE)
  inviteCode String?   @unique
  archivedAt DateTime?
  createdAt  DateTime  @default(now())

  members  GroupMember[]
  expenses Expense[]
  payments Payment[]
}

model GroupMember {
  id              String     @id @default(uuid())
  role            MemberRole @default(MEMBER)
  splitPercentage Decimal?   @db.Decimal(5,2)
  joinedAt        DateTime   @default(now())

  userId  String
  user    User   @relation(fields: [userId], references: [id])
  groupId String
  group   Group  @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}
```

> El modelo `Couple` anterior fue reemplazado por `Group` + `GroupMember`. Los grupos pueden ser de tipo `COUPLE` (2 personas) o `GROUP` (3+). Cada usuario puede pertenecer a múltiples grupos.

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
  groupId     String
  group       Group            @relation(fields: [groupId], references: [id])

  splits      ExpenseSplit[]
}
```

> **Soft-delete:** Solo `Expense` usa `deletedAt`. `User` y `Group` se eliminan realmente (no tienen soft-delete).

### ExpenseSplit (implemented ✓)

```prisma
model ExpenseSplit {
  id          String   @id @default(uuid())
  percentage  Decimal  @db.Decimal(5,2)
  createdAt   DateTime @default(now())

  expenseId   String
  expense     Expense  @relation(fields: [expenseId], references: [id])

  userId      String
  user        User     @relation(fields: [userId], references: [id])

  @@unique([expenseId, userId])
}
```

### Payment (implemented ✓)

```prisma
model Payment {
  id          String   @id @default(uuid())
  amount      Decimal  @db.Decimal(12,2)
  createdAt   DateTime @default(now())

  fromUserId  String
  toUserId    String

  fromUser    User     @relation("SentPayments", fields: [fromUserId], references: [id])
  toUser      User     @relation("ReceivedPayments", fields: [toUserId], references: [id])

  groupId     String
  group       Group    @relation(fields: [groupId], references: [id])

  @@index([groupId])
  @@index([fromUserId])
  @@index([toUserId])
}
```

### RefreshToken (implemented ✓)

```prisma
model RefreshToken {
  id         String   @id @default(uuid())
  tokenHash  String   @unique
  userId     String
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
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
  PERSONAL
  CUSTOM
}

enum GroupType {
  PERSONAL
  COUPLE
  GROUP
}

enum MemberRole {
  OWNER
  ADMIN
  MEMBER
}
```

## API DTOs (Request)

```typescript
// Auth
class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

class LoginDto {
  email: string;
  password: string;
}

class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseSplitDto)
  splits?: CreateExpenseSplitDto[];
}

class CreateExpenseSplitDto {
  @IsString()
  @IsUUID()
  userId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  percentage: number;
}

// Group — Create
class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;
}

// Group — Join
class JoinGroupDto {
  @IsString()
  inviteCode: string;
}

// Group — Update
class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;
}

// Group — Update Member Split
class UpdateMemberSplitDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
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
    firstName: string;
    lastName: string;
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
  paidBy: { id: string; firstName: string; lastName: string; email: string };
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
  groupId: string;
  fromUser?: { id: string; firstName: string; lastName: string };
  toUser?: { id: string; firstName: string; lastName: string };
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

// Settlement Suggestions
interface SettlementSuggestionsResponse {
  group: { id: string; name: string };
  members: {
    user: { id: string; firstName: string; lastName: string };
    paid: number;
    share: number;
    balance: number;
  }[];
  suggestions: {
    from: { id: string; firstName: string; lastName: string };
    to: { id: string; firstName: string; lastName: string };
    amount: number;
  }[];
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
