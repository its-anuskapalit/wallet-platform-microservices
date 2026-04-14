# RewardsService cheat sheet

- **Port:** 5005  
- **Gateway prefix:** `/gateway/rewards`  
- **DbContext:** `RewardsDbContext`  
- **Key endpoints:** `GET api/rewards`, `GET api/rewards/history` (JWT); `GET api/rewards/account/{userId}` and `POST api/rewards/deduct` (**AllowAnonymous** — intended for internal/Catalog calls; protect at network layer)  
- **Publishes:** —  
- **Consumes:**  
  - `UserRegisteredEvent` — `rewards.user.registered.queue` / `user.registered`  
  - `TransactionCompletedEvent` — `transaction.completed.rewards.queue` / `transaction.completed` (award points to sender)  
- **Outbound HTTP:** —  
- **Code entry:** [`RewardsController`](../../../src/Services/RewardsService/RewardsService.API/Controllers/RewardsController.cs), consumers under `RewardsService.Infrastructure/Consumers/`
