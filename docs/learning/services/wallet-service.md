# WalletService cheat sheet

- **Port:** 5003  
- **Gateway prefix:** `/gateway/wallet` (includes `.../billsplit`)  
- **DbContext:** `WalletDbContext` (wallets, idempotency keys, bill splits)  
- **Key endpoints (JWT unless noted):** `GET api/wallet`, `GET api/wallet/lookup/{userId}`, `POST topup`, `POST deduct`, `POST admin/freeze|unfreeze/{userId}` (Admin); bill split: `POST api/wallet/billsplit`, `GET .../created`, `GET .../owed`, `POST .../{id}/pay`  
- **Publishes:** `WalletFrozenEvent` → `wallet.exchange` / `wallet.frozen`  
- **Consumes:**  
  - `UserRegisteredEvent` — `wallet.creation.queue` / `user.registered`  
  - `TransactionCompletedEvent` — `transaction.completed.wallet.queue` / `transaction.completed` (debit/credit balances for **Transfer**)  
- **Outbound HTTP:** `ILedgerClient` → Ledger base URL (`Ledger:BaseUrl`) for bill-split ledger posting  
- **Idempotency:** `IIdempotencyRepository` for top-up/deduct and transfer credit/debit keys  
- **Code entry:** [`WalletController`](../../../src/Services/WalletService/WalletService.API/Controllers/WalletController.cs), [`BillSplitController`](../../../src/Services/WalletService/WalletService.API/Controllers/BillSplitController.cs), [`WalletDomainService`](../../../src/Services/WalletService/WalletService.Core/Services/WalletService.cs), [`TransactionCompletedConsumer`](../../../src/Services/WalletService/WalletService.Infrastructure/Consumers/TransactionCompletedConsumer.cs)
