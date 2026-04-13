# WalletPlatform — Low-Level Design (LLD)

**Document:** Low-Level Design  
**Product:** Aurelian / WalletPlatform  
**Version:** 1.0  

---

## 1. Purpose

This document refines the **High-Level Design** into **module-level** and **interaction-level** detail: layering inside each service, representative request flows, event choreography, idempotency, and key design types. It does not replace Swagger for exact request/response JSON schemas.

---

## 2. Standard service layering

Each .NET microservice follows the same physical layout:

```
{Service}.API/          → Controllers, Program.cs, DI wiring, middleware
{Service}.Core/         → Entities, DTOs, interfaces (I*Service, I*Repository), domain services
{Service}.Infrastructure/ → EF DbContext, repositories, RabbitMQ consumers/publishers, HTTP clients
{Service}.Tests/        → Unit tests (xUnit, Moq, FluentAssertions)
```

### 2.1 Cross-cutting types (`Shared.*`)

| Assembly | Responsibility |
|----------|------------------|
| **Shared.Common** | `Result<T>`, shared middleware helpers, base types. |
| **Shared.Contracts** | Event DTOs, queue/exchange name constants (`EventQueues`). |
| **Shared.EventBus** | `RabbitMqEventPublisher`, `BaseConsumer<T>` pattern, options binding. |

### 2.2 Domain error handling

- Business validation returns **`Result<T>.Failure(message)`** rather than throwing for expected cases.
- API layer maps `IsSuccess` to **200/201**, **400**, **401**, **404**, **409** as appropriate.

---

## 3. API gateway (Ocelot) — low-level behavior

**Project:** `src/Gateway/ApiGateway`

- **Upstream:** `http://localhost:5000/gateway/{segment}/{everything}`
- **Downstream:** Rewrites to `http://localhost:{port}/api/{segment}/...` per route table in `ocelot.json`.
- **Authentication:** JWT validation configured in Ocelot pipeline; invalid tokens short-circuit before downstream call.
- **CORS:** Application CORS policy (e.g. Angular origin); must be tightened per environment.

**Limitation:** Downstream `Host` is `localhost` in repo config; Docker/K8s requires **environment-specific** Ocelot configuration.

---

## 4. Service-specific LLD

### 4.1 AuthService

| Component | Responsibility |
|-----------|------------------|
| `AuthController` | Register, login, refresh, revoke, me, change-password, send/verify OTP. |
| `IAuthService` / implementation | Password hashing, token issuance, refresh rotation. |
| `IOtpService` / `OtpDomainService` | Generate OTP, persist `PhoneOtp`, email via MailKit, verify. |
| `AuthDbContext` | Users, refresh tokens, OTP entities. |

**Tokens:** Access JWT carries claims (`sub`, email, role, name); refresh token stored server-side with expiry/revocation.

---

### 4.2 UserProfileService

| Component | Responsibility |
|-----------|------------------|
| `ProfileController` | GET/PUT profile, email lookup, admin list. |
| `KycController` | Submit KYC; admin review endpoint. |
| Repositories | Profile and KYC persistence. |

**Events:** KYC status changes publish notifications consumed by NotificationService.

---

### 4.3 WalletService

| Component | Responsibility |
|-----------|------------------|
| `WalletController` | Get wallet, lookup by user id, top-up, deduct, admin freeze/unfreeze. |
| `BillSplitController` | Create split, list created/owed, pay share (calls **Ledger** over HTTP). |
| `WalletDomainService` | Balance mutations for top-up/deduct with **idempotency** table. |
| `TransactionCompletedConsumer` | On `transaction.completed`, **debit** sender wallet and **credit** receiver (Transfer only). |
| `ILedgerClient` / `LedgerApiClient` | HTTP initiate transfer for bill-split pay with forwarded JWT. |

**Self-healing:** If wallet missing on read, can create zero wallet when appropriate (registration event missed).

**Bill split pay flow (summary):** Validate participant → resolve payer/creator wallets → `POST` Ledger with idempotency key `billsplit:{splitId}:{payerUserId}` → mark participant paid in SQL.

---

### 4.4 LedgerService

| Component | Responsibility |
|-----------|------------------|
| `TransactionController` | Initiate transaction (JWT user = sender), summary, get by id, paged `my`. |
| `TransactionService` | Validates amount, **no self-wallet** transfer, parses type, creates `Transaction` + **LedgerEntry** rows, transitions status, publishes events. |

**Rules (examples):**

- `ReceiverUserId` must not equal current user (no self-send at user level).
- `SenderWalletId` ≠ `ReceiverWalletId`.
- Duplicate `IdempotencyKey` returns existing mapped transaction.

**Events:** `transaction.completed` / `transaction.failed` drive downstream systems.

---

### 4.5 RewardsService

| Component | Responsibility |
|-----------|------------------|
| `RewardsController` | Account for user, history, internal deduct (catalog). |
| `TransactionCompletedConsumer` | Computes base + campaign bonus points, updates account. |
| `UserRegisteredConsumer` | Welcome bonus / account creation. |

**Tiers:** Derived from rolling available/total points thresholds (see product README for tier table).

---

### 4.6 CatalogService

| Component | Responsibility |
|-----------|------------------|
| `CatalogController` | List/create items (admin-style seeding). |
| `RedemptionController` | Redeem, list my redemptions. |
| `IRewardsClient` | HTTP to RewardsService to validate balance and post deductions. |

**PointsRedeemed** event: notifies other bounded contexts as configured.

---

### 4.7 NotificationService

- Consumes: user registered, KYC updated, transaction completed/failed, wallet frozen.
- Sends SMTP email via configured provider (MailKit).

---

### 4.8 ReceiptsService

- Consumes **transaction.completed** (with enriched fields such as memo where implemented).
- Persists receipt row; exposes PDF generation (QuestPDF) and CSV export endpoints.

---

### 4.9 AdminService

- Dashboard aggregates.
- Fraud flag on transactions; listing flagged items.
- Coordinates with wallet/profile data via HTTP or local admin DB (per implementation).

---

## 5. Sequence flows (condensed)

### 5.1 User registration

1. `POST /api/auth/register` → Auth persists user, issues tokens, publishes **UserRegistered**.  
2. Consumers: Wallet creates wallet; Profile ensures row; Rewards creates account; Notification sends welcome.  
3. Frontend stores tokens and routes to onboarding/dashboard.

### 5.2 Top-up (synchronous wallet path)

1. `POST /api/wallet/topup` with `idempotencyKey`.  
2. WalletService validates wallet, applies idempotent credit, updates balance.  
3. Response returns updated wallet DTO.  
*(Top-up may or may not pass through Ledger depending on product configuration; ledger is canonical for peer transfers.)*

### 5.3 Peer transfer (ledger-centric)

1. `POST /api/transactions` with receiver wallet/user ids, amount, idempotency key, optional memo.  
2. Ledger creates pending → completed transaction, writes double-entry, publishes **transaction.completed**.  
3. Wallet consumer adjusts balances; Rewards awards points; Receipts stores receipt; Notification emails.

### 5.4 Bill split pay

1. `POST /api/wallet/billsplit/{id}/pay` with `Authorization` header.  
2. WalletService validates share, calls Ledger client with memo describing split.  
3. Same event chain as 5.3 for wallet/rewards/receipts.

---

## 6. RabbitMQ bindings (reference)

Constants live in `Shared.Contracts.EventQueues`:

- **Exchanges (examples):** `user.exchange`, `transaction.exchange`, `wallet.exchange`, `catalog.exchange`, `dead.letter.exchange`.
- **Queues (examples):** `wallet.creation.queue`, `transaction.completed.wallet.queue`, `transaction.completed.rewards.queue`, `transaction.completed.receipts.queue`, `transaction.completed.notification.queue`, `transaction.failed.notification.queue`, `wallet.frozen.notification.queue`, `kyc.updated.notification.queue`, `user.registered.notification.queue`, `rewards.user.registered.queue`, `points.redeemed.queue`.

**Consumer base:** `BaseConsumer<T>` declares queue, exchange, routing key; manual ack; error handling hooks.

---

## 7. Idempotency — design detail

| Location | Key shape | Storage |
|----------|-----------|---------|
| Wallet top-up / deduct | Client-provided or generated UUID string | `IdempotencyKey` entity + cached JSON response (optional). |
| Ledger initiate | `IdempotencyKey` on `Transaction` | Duplicate POST returns same transaction DTO. |
| Bill split pay | `billsplit:{splitGuid}:{payerUserGuid}` | Prevents double pay for same user on same split. |

---

## 8. Angular application structure

```
frontend/wallet-platform/src/app/
  core/           services, guards, interceptors, models
  features/       route-level feature modules (lazy loaded)
  layout/         shell, sidebar
  shared/         chatbot, toast, skeleton, etc.
```

- **State:** Signals + computed; no global NgRx store.
- **HTTP:** Centralized `environment.apiGatewayUrl` + feature services (`WalletService`, `TransactionService`, …).
- **Errors:** Interceptor surfaces toast on network/401/403/5xx.

---

## 9. Chatbot service (Python)

- **FastAPI** app; **Gemini** model via API key.  
- **CORS** limited to frontend origin in config.  
- **Out of band:** Does not participate in monetary authorization.

---

## 10. Testing strategy (low level)

| Layer | Tooling | Focus |
|-------|---------|--------|
| Domain | xUnit + Moq | `Result` paths, calculators, validators. |
| API | WebApplicationFactory (optional) | Auth headers, status codes. |
| Frontend | Jasmine/Karma or Cypress (optional) | Critical flows. |

---

## 11. Document history

| Version | Date | Note |
|---------|------|------|
| 1.0 | 2026-04 | Initial LLD from repository structure |
