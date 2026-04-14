# Vertical slice: money flows (wallet balance, P2P transfer, ledger)

This slice separates **two different paths**: (A) **top-up / deduct** on the wallet API only, and (B) **peer-to-peer transfer**, which is initiated against the **Ledger** API and then reflected on wallet balances via **RabbitMQ**.

## A — Top-up (wallet only, no ledger)

1. **UI** — [`wallet.component.ts`](../../frontend/wallet-platform/src/app/features/wallet/wallet.component.ts) `onTopUp()` calls `WalletService.topUp()` with `idempotencyKey`.
2. **Angular** — [`wallet.service.ts`](../../frontend/wallet-platform/src/app/core/services/wallet.service.ts): `POST /gateway/wallet/topup` → Wallet service **5003** `/api/wallet/topup`.
3. **Domain** — [`WalletDomainService.TopUpAsync`](../../src/Services/WalletService/WalletService.Core/Services/WalletService.cs): idempotency check (`IIdempotencyRepository`), load or create wallet, increment `Balance`, persist, cache idempotency response.

Top-up increases **Wallet DB** balance directly. It does **not** go through `TransactionController` or double-entry ledger tables.

## B — Send money / P2P transfer (Ledger + async wallet)

### 1) Frontend resolves recipient and calls Ledger

1. User enters recipient email → `ProfileService.lookupByEmail` → `/gateway/profile/lookup`.
2. Then `WalletService.getWalletByUserId(profile.userId)` → `/gateway/wallet/lookup/{userId}` for `receiverWalletId`.
3. **Initiate transfer** — `TransactionService.initiate()` → `POST /gateway/transactions` (empty path segment = collection on [`TransactionController`](../../src/Services/LedgerService/LedgerService.API/Controllers/TransactionController.cs)).

Payload includes `senderWalletId`, `receiverWalletId`, `receiverUserId`, `amount`, `currency`, `type: 'Transfer'`, `idempotencyKey`. **`senderUserId` is set from the JWT in the controller**, not from the client body.

### 2) Ledger records truth (double-entry + event)

[`TransactionService.InitiateAsync`](../../src/Services/LedgerService/LedgerService.Core/Services/TransactionService.cs):

- Idempotency: if `IdempotencyKey` already exists, returns the previous `TransactionDto`.
- Inserts `Transaction` (status → **Completed** in same flow) and two `LedgerEntry` rows (debit sender wallet, credit receiver wallet) in **Ledger DB**.
- Publishes `TransactionCompletedEvent` to `transaction.exchange`, routing key `transaction.completed`.

### 3) Wallet balances catch up via consumer

[`WalletService.Infrastructure.Consumers.TransactionCompletedConsumer`](../../src/Services/WalletService/WalletService.Infrastructure/Consumers/TransactionCompletedConsumer.cs):

- Subscribes to queue `transaction.completed.wallet.queue`, exchange `transaction.exchange`, routing key `transaction.completed`.
- For `TransactionType` **Transfer** only: calls `IWalletService.DebitTransferAsync` (sender) and `CreditAsync` (receiver), each idempotent on **transaction ID** (`debit:{id}` / `credit:{id}` keys).

So: **ledger rows are authoritative for the transfer record**; **wallet `Balance` is updated asynchronously** to match. If RabbitMQ is down, ledger may still commit while wallet balances lag until the consumer runs.

## Bill split pay path (uses HTTP to Ledger from Wallet)

[`BillSplitDomainService`](../../src/Services/WalletService/WalletService.Core/Services/BillSplitService.cs) uses [`ILedgerClient` / `LedgerApiClient`](../../src/Services/WalletService/WalletService.Infrastructure/Clients/LedgerApiClient.cs) to `POST api/transactions` on the Ledger base URL with the **caller's Authorization header** forwarded. That is the same Ledger endpoint as the SPA uses, but invoked server-to-server from Wallet.

## Optional: read from Angular

- List/history: [`transaction.service.ts`](../../frontend/wallet-platform/src/app/core/services/transaction.service.ts) → `GET /gateway/transactions/my`, `summary`, etc.

## Related reading

- [cross-cutting.md](./cross-cutting.md) — idempotency, other `transaction.completed` consumers (rewards, receipts, notifications).
- [api-inventory.md](./api-inventory.md) — wallet + transactions endpoints.
