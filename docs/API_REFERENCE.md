# WalletPlatform — Aurelian
## API Reference (Gateway-first)

## 1. Overview
This document describes the **public-facing** REST APIs as accessed through the **Ocelot API Gateway**.

- **Gateway base URL**: `http://localhost:5000`
- **Gateway prefix**: `/gateway`
- **Downstream convention**: gateway routes map to downstream `/api/...` on each service.

> For developer details, each .NET service also exposes Swagger at `http://localhost:{servicePort}/swagger`.

## 2. Authentication
### 2.1 JWT bearer token
Most endpoints require:
- Header: `Authorization: Bearer <accessToken>`

### 2.2 RBAC
Admin-only endpoints require the JWT to contain role `Admin`.

## 3. Gateway route map (authoritative)
From `src/Gateway/ApiGateway/ocelot.json`:
- `/gateway/auth/{*}` → Auth Service (`/api/auth/{*}`)
- `/gateway/profile/{*}` → UserProfile Service (`/api/profile/{*}`)
- `/gateway/kyc/{*}` → UserProfile Service (`/api/kyc/{*}`)
- `/gateway/wallet/{*}` → Wallet Service (`/api/wallet/{*}`)
- `/gateway/transactions/{*}` → Ledger Service (`/api/transactions/{*}`)
- `/gateway/rewards/{*}` → Rewards Service (`/api/rewards/{*}`)
- `/gateway/catalog/{*}` → Catalog Service (`/api/catalog/{*}`)
- `/gateway/redemptions/{*}` → Catalog Service (`/api/redemptions/{*}`)
- `/gateway/receipts/{*}` → Receipts Service (`/api/receipts/{*}`)
- `/gateway/admin/{*}` → Admin Service (`/api/admin/{*}`)

## 4. Endpoint reference

## 4.1 Auth Service (via gateway)
### POST `/gateway/auth/register`
Creates a user and returns tokens (201).

### POST `/gateway/auth/login`
Authenticates and returns tokens (200).

### POST `/gateway/auth/refresh`
Rotates refresh token and returns new tokens (200).

### POST `/gateway/auth/revoke` (JWT required)
Revokes a refresh token (204).

### GET `/gateway/auth/me` (JWT required)
Returns caller identity claims (200).

### POST `/gateway/auth/change-password` (JWT required)
Changes password (204).

### POST `/gateway/auth/send-otp`
Sends OTP for verification (200).

### POST `/gateway/auth/verify-otp`
Verifies OTP (200).

---

## 4.2 User Profile Service (via gateway)
### GET `/gateway/profile`
Get or create the current user’s profile (200).

### PUT `/gateway/profile`
Update mutable profile fields (200).

### GET `/gateway/profile/lookup?email={email}`
Lookup a profile by email (200 / 404).

### GET `/gateway/profile/admin/all?page=1&pageSize=20` (Admin)
Paginated list of all profiles (200).

---

## 4.3 KYC (User Profile Service via gateway)
### POST `/gateway/kyc/submit`
Submit KYC document payload (200).

### POST `/gateway/kyc/review/{userProfileId}` (Admin)
Approve/reject KYC for a profile (200).

---

## 4.4 Wallet Service (via gateway)
### GET `/gateway/wallet`
Get current user wallet (200 / 404).

### GET `/gateway/wallet/lookup/{userId}`
Get wallet for a specific `userId` (200 / 404).

### POST `/gateway/wallet/topup`
Top up current wallet (200).

### POST `/gateway/wallet/deduct`
Deduct from current wallet (200).

### POST `/gateway/wallet/admin/freeze/{userId}` (Admin)
Freeze a user wallet with reason payload (200).

### POST `/gateway/wallet/admin/unfreeze/{userId}` (Admin)
Unfreeze a user wallet (200).

---

## 4.5 Bill Split (Wallet Service via gateway)
### POST `/gateway/wallet/billsplit`
Create bill split (200).

### GET `/gateway/wallet/billsplit/created`
List bill splits created by me (200).

### GET `/gateway/wallet/billsplit/owed`
List bill splits where I owe money (200).

### POST `/gateway/wallet/billsplit/{id}/pay`
Pay my share (200).

---

## 4.6 Ledger / Transactions (via gateway)
### POST `/gateway/transactions`
Initiate a transaction (200).

### GET `/gateway/transactions/summary`
Get aggregate stats for the current user (200).

### GET `/gateway/transactions/{transactionId}`
Get transaction by id (200 / 404).

### GET `/gateway/transactions/my?page=1&pageSize=20`
Get my transactions (200).

---

## 4.7 Rewards (via gateway)
### GET `/gateway/rewards`
Get rewards account summary for current user (200 / 404).

### GET `/gateway/rewards/history`
Get points history (200 / 404).

> Internal endpoints (called service-to-service) exist on Rewards Service:
> - `GET /api/rewards/account/{userId}`
> - `POST /api/rewards/deduct`

---

## 4.8 Catalog + Redemptions (via gateway)
### GET `/gateway/catalog` (public)
List active catalog items (200).

### POST `/gateway/catalog` (Admin)
Create catalog item (201).

### POST `/gateway/redemptions`
Redeem a catalog item (200).

### GET `/gateway/redemptions/my`
My redemption history (200).

---

## 4.9 Receipts (via gateway)
### GET `/gateway/receipts/transaction/{transactionId}`
Get receipt JSON by transaction (200 / 404).

### GET `/gateway/receipts/transaction/{transactionId}/pdf`
Download PDF receipt (200 / 404).

### GET `/gateway/receipts/my`
List my receipts (200).

### GET `/gateway/receipts/export/csv`
Download receipts CSV (200).

---

## 4.10 Admin (via gateway, Admin-only)
### GET `/gateway/admin/dashboard`
Dashboard statistics (200).

### POST `/gateway/admin/transactions/{transactionId}/flag`
Flag transaction as potentially fraudulent (200 / 400).

### GET `/gateway/admin/transactions/fraud-flags`
List fraud flags (200).

## 5. Chatbot API (direct, not via gateway)
The chatbot is a separate FastAPI app:
- **Base URL**: `http://localhost:8000`
- **Docs**: `http://localhost:8000/docs`

### POST `/api/chat`
Request body:

```json
{
  "message": "How do I redeem points?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ]
}
```

Response body:

```json
{ "reply": "You can redeem points from the Rewards > Catalog tab..." }
```

### GET `/health`
Returns `{ "status": "ok", "ai_configured": true|false }`.

## 6. Status codes & error shape
Common HTTP statuses:
- `200`: Success (JSON)
- `201`: Created (JSON)
- `204`: Success, no body
- `400`: Validation/business rule failure (often `{ "error": "..." }`)
- `401`: Unauthorized
- `403`: Forbidden (role missing)
- `404`: Not found
- `500/502/503`: Server/upstream/AI configuration errors

