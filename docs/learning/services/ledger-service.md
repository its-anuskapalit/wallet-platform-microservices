# LedgerService cheat sheet

- **Port:** 5004  
- **Gateway prefix:** `/gateway/transactions`  
- **DbContext:** `LedgerDbContext` (`Transaction`, `LedgerEntry`)  
- **Key endpoints (JWT):** `POST api/transactions` (initiate; sets `SenderUserId` from token), `GET summary`, `GET {id}`, `GET my`  
- **Publishes:** `TransactionCompletedEvent` → `transaction.exchange` / `transaction.completed` (after double-entry persist)  
- **Consumes:** —  
- **Outbound HTTP:** —  
- **Idempotency:** `IdempotencyKey` on transaction — duplicate requests return same result  
- **Code entry:** [`TransactionController`](../../../src/Services/LedgerService/LedgerService.API/Controllers/TransactionController.cs), [`TransactionService`](../../../src/Services/LedgerService/LedgerService.Core/Services/TransactionService.cs)
