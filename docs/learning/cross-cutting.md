# Cross-cutting concerns

## EF Core: one DbContext per service

Each microservice owns its own SQL Server database schema via a dedicated `DbContext` (migrations run in Development in each API’s `Program.cs`).

| Service | DbContext |
|---------|-----------|
| Auth | [`AuthDbContext`](../../src/Services/AuthService/AuthService.Infrastructure/Data/AuthDbContext.cs) |
| UserProfile | [`UserProfileDbContext`](../../src/Services/UserProfileService/UserProfileService.Infrastructure/Data/UserProfileDbContext.cs) |
| Wallet | [`WalletDbContext`](../../src/Services/WalletService/WalletService.Infrastructure/Data/WalletDbContext.cs) |
| Ledger | [`LedgerDbContext`](../../src/Services/LedgerService/LedgerService.Infrastructure/Data/LedgerDbContext.cs) |
| Rewards | [`RewardsDbContext`](../../src/Services/RewardsService/RewardsService.Infrastructure/Data/RewardsDbContext.cs) |
| Catalog | [`CatalogDbContext`](../../src/Services/CatalogService/CatalogService.Infrastructure/Data/CatalogDbContext.cs) |
| Receipts | [`ReceiptsDbContext`](../../src/Services/ReceiptsService/ReceiptsService.Infrastructure/Data/ReceiptsDbContext.cs) |
| Admin | [`AdminDbContext`](../../src/Services/AdminService/AdminService.Infrastructure/Data/AdminDbContext.cs) |
| Notification | [`NotificationDbContext`](../../src/Services/NotificationService/NotificationService.Infrastructure/Data/NotificationDbContext.cs) |

No shared database across services; consistency is eventual (events + HTTP calls).

---

## Shared.EventBus

- **Publish:** [`IEventPublisher` / `RabbitMqEventPublisher`](../../src/Shared/Shared.EventBus/Options/RabbitMqEventPublisher.cs) — direct exchange, durable, JSON body, dead-letter exchange declared in publisher.
- **Consume:** [`BaseConsumer<T>`](../../src/Shared/Shared.EventBus/BaseConsumer.cs) — declares exchange + durable queue bound with routing key, DLQ via `x-dead-letter-exchange`, `BasicQos(0,1)`, manual ack.

Constants: [`EventQueues`](../../src/Shared/Shared.Contracts/EventQueues.cs).

### Publishers (who calls `PublishAsync`)

| Producer | Exchange | Routing key | Payload |
|----------|----------|-------------|---------|
| Auth `AuthDomainService.RegisterAsync` | `user.exchange` | `user.registered` | `UserRegisteredEvent` |
| UserProfile `KycService` (on admin review) | `user.exchange` | `kyc.status.updated` | `KYCStatusUpdatedEvent` |
| Ledger `TransactionService.InitiateAsync` | `transaction.exchange` | `transaction.completed` | `TransactionCompletedEvent` |
| Wallet `WalletDomainService.FreezeAsync` | `wallet.exchange` | `wallet.frozen` | `WalletFrozenEvent` |

*(If other publishers exist, search the repo for `PublishAsync`.)*

### Consumers (inherits `BaseConsumer<T>`)

| Service | Queue (constant) | Exchange | Routing key | Event type |
|---------|------------------|----------|-------------|------------|
| Wallet | `transaction.completed.wallet.queue` | `transaction.exchange` | `transaction.completed` | `TransactionCompletedEvent` |
| Rewards | `transaction.completed.rewards.queue` | `transaction.exchange` | `transaction.completed` | `TransactionCompletedEvent` |
| Receipts | `transaction.completed.receipts.queue` | `transaction.exchange` | `transaction.completed` | `TransactionCompletedEvent` |
| Notification | `transaction.completed.notification.queue` | `transaction.exchange` | `transaction.completed` | `TransactionCompletedEvent` |
| Notification | `transaction.failed.notification.queue` | `transaction.exchange` | `transaction.failed` | `TransactionFailedEvent` *(consumer only — no `PublishAsync` call found in repo for this event)* |
| Wallet | `wallet.creation.queue` | `user.exchange` | `user.registered` | `UserRegisteredEvent` |
| UserProfile | `wallet.creation.queue` | `user.exchange` | `user.registered` | `UserRegisteredEvent` |
| Rewards | `rewards.user.registered.queue` | `user.exchange` | `user.registered` | `UserRegisteredEvent` |
| Notification | `user.registered.notification.queue` | `user.exchange` | `user.registered` | `UserRegisteredEvent` |
| Notification | `kyc.updated.notification.queue` | `user.exchange` | `kyc.status.updated` | `KYCStatusUpdatedEvent` |
| Notification | `wallet.frozen.notification.queue` | `wallet.exchange` | `wallet.frozen` | `WalletFrozenEvent` |

**Topology note:** `Wallet` and `UserProfile` both use the **same queue name** `wallet.creation.queue` for `user.registered`. On one RabbitMQ cluster, that is a **single queue** with **competing consumers** across the two processes: each message is delivered to **one** consumer only. The codebase mitigates missed side effects with **self-healing** APIs (e.g. profile/wallet creation on first read). For production hardening, consider **separate queue names** per service bound to the same exchange/routing key.

---

## Idempotency

| Location | Mechanism |
|----------|-----------|
| Wallet `TopUpAsync` / `DeductAsync` | Client-supplied `IdempotencyKey` → `IIdempotencyRepository` stores serialized `WalletDto` response |
| Wallet `CreditAsync` / `DebitTransferAsync` | Keys `credit:{transactionId}` / `debit:{transactionId}` for ledger-driven balance updates |
| Ledger `InitiateAsync` | `IdempotencyKey` on `Transaction` — duplicate key returns existing mapped DTO |

---

## HTTP between services

| From | To | Purpose |
|------|-----|---------|
| Wallet | Ledger (`Ledger:BaseUrl`, default `http://localhost:5004`) | [`ILedgerClient`](../../src/Services/WalletService/WalletService.Infrastructure/Clients/LedgerApiClient.cs) — bill-split pay flow posts `api/transactions` with user JWT |
| Catalog | Rewards (`Services:RewardsUrl`, default `http://localhost:5005`) | [`IRewardsClient` / `HttpRewardsClient`](../../src/Services/CatalogService/CatalogService.Infrastructure/Clients/HttpRewardsClient.cs) — balance check + deduct for redemptions |

Browser → always via **gateway** (except internal anonymous endpoints should not be exposed publicly without network controls).

---

## Error handling

[`GlobalExceptionMiddleware`](../../src/Shared/Shared.Common/Middleware/GlobalExceptionMiddleware.cs) is registered in Auth, Wallet, Ledger, UserProfile, Rewards, Receipts, Admin, Catalog, and Notification APIs for consistent error JSON.

---

## Local infrastructure

[`docker/docker-compose.yml`](../../docker/docker-compose.yml) — SQL Server + RabbitMQ; APIs in the repo comment that Ocelot downstream hosts are `localhost` today.
