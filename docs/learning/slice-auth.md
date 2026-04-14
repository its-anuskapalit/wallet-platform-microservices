# Vertical slice: authentication (register, login, JWT)

End-to-end trace from the Angular UI through the gateway to token issuance and how the SPA attaches tokens to API calls.

## Sequence: login

1. **Route** — User opens `/auth/login` ([`app.routes.ts`](../../frontend/wallet-platform/src/app/app.routes.ts)).
2. **Component** — [`LoginComponent`](../../frontend/wallet-platform/src/app/features/auth/login/login.component.ts) submits email/password and calls `AuthService.login()`.
3. **Angular service** — [`auth.service.ts`](../../frontend/wallet-platform/src/app/core/services/auth.service.ts): `POST ${apiGatewayUrl}/auth/login` → e.g. `http://localhost:5000/gateway/auth/login`.
4. **Gateway** — Ocelot maps `/gateway/auth/{everything}` → `http://localhost:5001/api/auth/{everything}` ([`ocelot.json`](../../src/Gateway/ApiGateway/ocelot.json)).
5. **Controller** — [`AuthController.Login`](../../src/Services/AuthService/AuthService.API/Controllers/AuthController.cs) → `IAuthService.LoginAsync`.
6. **Domain** — [`AuthDomainService.LoginAsync`](../../src/Services/AuthService/AuthService.Core/Services/AuthService.cs): load user by email, verify BCrypt password, issue refresh token row + access JWT via `ITokenService`, return token DTO.
7. **Client storage** — `storeTokens` writes `access_token` and `refresh_token` to `localStorage`, then calls `GET .../auth/me` to populate `current_user` in memory + storage.

## Sequence: register (with OTP)

1. **Step 1** — [`RegisterComponent`](../../frontend/wallet-platform/src/app/features/auth/register/register.component.ts) validates the form and calls `sendOtp(phone, email)` → `POST /gateway/auth/send-otp`.
2. **Step 2** — After OTP entry, `verifyOtp` → `POST /gateway/auth/verify-otp`, then on success `register({ fullName, email, password, phone })` → `POST /gateway/auth/register`.
3. **Backend register** — `AuthDomainService.RegisterAsync`: reject duplicate email, hash password, persist user + refresh token, **publish** `UserRegisteredEvent` to `user.exchange` with routing key `user.registered`, return tokens (same as login storage path on the client).

## Protecting app routes

- [`authGuard`](../../frontend/wallet-platform/src/app/core/guards/auth.guard.ts) allows navigation if `AuthService.isAuthenticated()` is true — that is `!!currentUser signal || !!localStorage.access_token` (so a stale token in storage still passes until an API returns 401).

## Attaching JWT to APIs

- [`auth.interceptor.ts`](../../frontend/wallet-platform/src/app/core/interceptors/auth.interceptor.ts) clones each outgoing request with `Authorization: Bearer {access_token}` when a token exists.
- On **401**, if a refresh token exists, it calls `auth.refresh()` then retries the request once; otherwise navigates to `/auth/login`.
- Interceptors are registered in [`app.config.ts`](../../frontend/wallet-platform/src/app/app.config.ts) (`authInterceptor`, `errorInterceptor`).

## Validating JWT on the server (Auth service)

[`AuthService.API/Program.cs`](../../src/Services/AuthService/AuthService.API/Program.cs) configures `AddAuthentication(JwtBearerDefaults.AuthenticationScheme)` with issuer, audience, and signing key from configuration (`Jwt:Key`, `Jwt:Issuer`, `Jwt:Audience`). Same pattern is repeated on other APIs so tokens issued by Auth validate everywhere.

## Admin-only UI

- [`admin.guard.ts`](../../frontend/wallet-platform/src/app/core/guards/admin.guard.ts) (not expanded here) works with `AuthService.isAdmin` (`role === 'Admin'` from cached user / `me`).

## Related reading

- [api-inventory.md](./api-inventory.md) — full auth endpoint list.
- [cross-cutting.md](./cross-cutting.md) — RabbitMQ `user.registered` consumers.
