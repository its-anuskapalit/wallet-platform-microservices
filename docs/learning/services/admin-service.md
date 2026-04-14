# AdminService cheat sheet

- **Port:** 5009  
- **Gateway prefix:** `/gateway/admin`  
- **DbContext:** `AdminDbContext` (fraud flags, dashboard aggregates per schema)  
- **Key endpoints (JWT + Admin role):** `GET api/admin/dashboard`; `POST api/admin/transactions/{transactionId}/flag`, `GET api/admin/transactions/fraud-flags`  
- **Publishes:** —  
- **Consumes:** —  
- **Outbound HTTP:** —  
- **Code entry:** [`AdminDashboardController`](../../../src/Services/AdminService/AdminService.API/Controllers/AdminDashboardController.cs), [`AdminTransactionController`](../../../src/Services/AdminService/AdminService.API/Controllers/AdminTransactionController.cs)
