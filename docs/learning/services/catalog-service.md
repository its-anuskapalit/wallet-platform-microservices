# CatalogService cheat sheet (catalog + redemptions)

- **Port:** 5006  
- **Gateway prefix:** `/gateway/catalog`, `/gateway/redemptions`  
- **DbContext:** `CatalogDbContext` (items, redemptions)  
- **Key endpoints:**  
  - `GET api/catalog` (anonymous), `POST api/catalog` (Admin)  
  - `POST api/redemptions`, `GET api/redemptions/my` (JWT)  
- **Publishes:** — *(no `IEventPublisher` in CatalogService)*  
- **Consumes:** —  
- **Outbound HTTP:** `IRewardsClient` / `HttpRewardsClient` → Rewards service (`Services:RewardsUrl`) for point balance and deduction on redeem  
- **Code entry:** [`CatalogController`](../../../src/Services/CatalogService/CatalogService.API/Controllers/CatalogController.cs), [`RedemptionController`](../../../src/Services/CatalogService/CatalogService.API/Controllers/RedemptionController.cs), [`RedemptionService`](../../../src/Services/CatalogService/CatalogService.Core/Services/RedemptionService.cs)
