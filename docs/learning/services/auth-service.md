# AuthService cheat sheet

- **Port:** 5001  
- **Gateway prefix:** `/gateway/auth` → `/api/auth`  
- **DbContext:** `AuthDbContext` (users, refresh tokens, OTP storage per your schema)  
- **Key endpoints:** `POST register`, `login`, `refresh`; `GET me`, `POST change-password`, `POST revoke` (JWT); `POST send-otp`, `verify-otp`; `GET admin-only` (Admin)  
- **Publishes:** `UserRegisteredEvent` → `user.exchange` / `user.registered`  
- **Consumes:** —  
- **Outbound HTTP:** — (email via `IEmailSender` SMTP)  
- **JWT:** Issues and validates Bearer tokens (`Program.cs` — same signing config must match other services)  
- **Code entry:** [`Program.cs`](../../../src/Services/AuthService/AuthService.API/Program.cs), [`AuthController`](../../../src/Services/AuthService/AuthService.API/Controllers/AuthController.cs), [`AuthDomainService`](../../../src/Services/AuthService/AuthService.Core/Services/AuthService.cs)
