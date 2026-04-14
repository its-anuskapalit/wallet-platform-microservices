# NotificationService cheat sheet

- **Port:** 5007  
- **Gateway:** Not routed in `ocelot.json` (no public API surface in this repo)  
- **DbContext:** `NotificationDbContext` (notification log / templates per schema)  
- **HTTP controllers:** —  
- **Publishes:** —  
- **Consumes (all via `BaseConsumer<T>`):**  
  - `UserRegisteredEvent` — `user.registered.notification.queue` / `user.registered`  
  - `TransactionCompletedEvent` — `transaction.completed.notification.queue` / `transaction.completed`  
  - `TransactionFailedEvent` — `transaction.failed.notification.queue` / `transaction.failed` *(no publisher located in repo)*  
  - `KYCStatusUpdatedEvent` — `kyc.updated.notification.queue` / `kyc.status.updated`  
  - `WalletFrozenEvent` — `wallet.frozen.notification.queue` / `wallet.frozen`  
- **Outbound HTTP / email:** Mail/other channels inside consumer handlers (see `NotificationService.Core` / Infrastructure)  
- **Code entry:** [`NotificationService.API/Program.cs`](../../../src/Services/NotificationService/NotificationService.API/Program.cs), `NotificationService.Infrastructure/Consumers/`
