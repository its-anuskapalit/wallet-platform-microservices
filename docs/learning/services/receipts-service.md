# ReceiptsService cheat sheet

- **Port:** 5008  
- **Gateway prefix:** `/gateway/receipts`  
- **DbContext:** `ReceiptsDbContext`  
- **Key endpoints (JWT):** `GET api/receipts/transaction/{transactionId}`, `GET my`, `GET .../pdf`, `GET export/csv`  
- **Publishes:** —  
- **Consumes:** `TransactionCompletedEvent` — `transaction.completed.receipts.queue` / `transaction.completed`  
- **Outbound HTTP:** —  
- **Code entry:** [`ReceiptsController`](../../../src/Services/ReceiptsService/ReceiptsService.API/Controllers/ReceiptsController.cs), [`TransactionCompletedConsumer`](../../../src/Services/ReceiptsService/ReceiptsService.Infrastructure/Consumers/TransactionCompletedConsumer.cs)
