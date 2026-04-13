# WalletPlatform — API Reference

**Document:** API Reference  
**Product:** Aurelian / WalletPlatform  
**Version:** 1.0  

---

## 1. Conventions

### 1.1 Base URLs (local development)

| Usage | Base URL |
|-------|-----------|
| **Through gateway (recommended for SPA)** | `http://localhost:5000` |
| **Direct to service (Swagger / debugging)** | `http://localhost:{port}` per table below |

### 1.2 Authentication

| Header | When required |
|--------|----------------|
| `Authorization: Bearer <access_token>` | All routes marked **JWT** (and **Admin** where noted). |

**Anonymous** endpoints accept requests without `Authorization`.

### 1.3 Content type

- Request/response bodies: **`application/json`** unless noted (PDF/CSV downloads).

### 1.4 Common error shape

Many endpoints return:

```json
{ "error": "Human-readable message" }
```

HTTP status: **400** validation/business, **401** unauthorized, **403** forbidden, **404** not found, **409** conflict (e.g. duplicate email on register).

### 1.5 Swagger UI (per service)

| Service | Direct Swagger URL |
|---------|---------------------|
| Auth | http://localhost:5001/swagger |
| UserProfile | http://localhost:5002/swagger |
| Wallet | http://localhost:5003/swagger |
| Ledger | http://localhost:5004/swagger |
| Rewards | http://localhost:5005/swagger |
| Catalog | http://localhost:5006/swagger |
| Receipts | http://localhost:5008/swagger |
| Admin | http://localhost:5009/swagger |
| Chatbot | http://localhost:8000/docs |

---

## 2. API Gateway route map

Upstream pattern: **`http://localhost:5000/gateway/{segment}/{path}`** → downstream **`/api/{segment}/{path}`** on the service port.

| Gateway prefix | Downstream service | Port |
|----------------|-------------------|------|
| `/gateway/auth/{everything}` | AuthService | 5001 |
| `/gateway/profile/{everything}` | UserProfileService | 5002 |
| `/gateway/kyc/{everything}` | UserProfileService | 5002 |
| `/gateway/wallet/{everything}` | WalletService | 5003 |
| `/gateway/transactions/{everything}` | LedgerService | 5004 |
| `/gateway/rewards/{everything}` | RewardsService | 5005 |
| `/gateway/catalog/{everything}` | CatalogService | 5006 |
| `/gateway/redemptions/{everything}` | CatalogService | 5006 |
| `/gateway/receipts/{everything}` | ReceiptsService | 5008 |
| `/gateway/admin/{everything}` | AdminService | 5009 |

**Example:** `GET http://localhost:5000/gateway/wallet` → `GET http://localhost:5003/api/wallet`

---

## 3. Auth Service — `/api/auth`

**Port:** 5001  

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Anonymous | Register; returns tokens. **409** if email exists. |
| POST | `/api/auth/login` | Anonymous | Login; returns tokens. |
| POST | `/api/auth/refresh` | Anonymous | Body: refresh token; new token pair. |
| POST | `/api/auth/revoke` | JWT | Revoke refresh token. **204** |
| GET | `/api/auth/me` | JWT | Current user claims summary. |
| POST | `/api/auth/change-password` | JWT | Change password. |
| POST | `/api/auth/send-otp` | Anonymous | Send OTP to phone (email in body). |
| POST | `/api/auth/verify-otp` | Anonymous | Verify OTP for phone. |
| GET | `/api/auth/admin-only` | JWT **Admin** | Smoke test for admin role. |

---

## 4. User Profile — `/api/profile`

**Port:** 5002 · **Auth:** JWT (all routes)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/profile` | User | Get or create profile for current user. |
| PUT | `/api/profile` | User | Update profile fields. |
| GET | `/api/profile/lookup?email=` | User | Resolve profile by email (send-money flow). |
| GET | `/api/profile/admin/all?page=&pageSize=` | **Admin** | Paginated list of profiles. |

---

## 5. KYC — `/api/kyc`

**Port:** 5002 · **Auth:** JWT

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/api/kyc/submit` | User | Submit KYC payload (`KycSubmitDto`). |
| POST | `/api/kyc/review/{userProfileId}` | **Admin** | Approve/reject KYC (`KycReviewDto`). |

---

## 6. Wallet — `/api/wallet`

**Port:** 5003 · **Auth:** JWT (all routes)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/api/wallet` | User | Current user’s wallet. |
| GET | `/api/wallet/lookup/{userId}` | User | Wallet by user id (recipient resolution). |
| POST | `/api/wallet/topup` | User | Body: `TopUpDto` (`amount`, `idempotencyKey`). |
| POST | `/api/wallet/deduct` | User | Body: `DeductDto` (`amount`, `idempotencyKey`). |
| POST | `/api/wallet/admin/freeze/{userId}` | **Admin** | Body: `FreezeDto` (reason). |
| POST | `/api/wallet/admin/unfreeze/{userId}` | **Admin** | Unfreeze wallet. |

---

## 7. Bill split — `/api/wallet/billsplit`

**Port:** 5003 · **Auth:** JWT  

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/wallet/billsplit` | Create split (`CreateBillSplitDto`). |
| GET | `/api/wallet/billsplit/created` | Splits created by current user. |
| GET | `/api/wallet/billsplit/owed` | Splits where current user owes a share. |
| POST | `/api/wallet/billsplit/{id}/pay` | Pay my share. **Requires** `Authorization` header forwarded to Ledger. |

---

## 8. Transactions (Ledger) — `/api/transactions`

**Port:** 5004 · **Auth:** JWT (controller-level)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transactions` | Initiate transfer/top-up style txn (`InitiateTransactionDto`). Sets `SenderUserId` from JWT. |
| GET | `/api/transactions/summary` | Aggregated stats for current user. |
| GET | `/api/transactions/{transactionId}` | Single transaction by id. |
| GET | `/api/transactions/my?page=&pageSize=` | Paged history for current user. |

**Initiate body (conceptual fields):** `senderWalletId`, `receiverWalletId`, `receiverUserId`, `amount`, `currency`, `type`, `idempotencyKey`, optional `memo` (max length enforced server-side).

---

## 9. Rewards — `/api/rewards`

**Port:** 5005  

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/rewards` | JWT | Current user rewards account. |
| GET | `/api/rewards/history` | JWT | Points history. |
| GET | `/api/rewards/account/{userId}` | **Anonymous** | Internal: account by user id (Catalog). |
| POST | `/api/rewards/deduct` | **Anonymous** | Internal: deduct points (`DeductPointsDto`). **204** |

> **Note:** Internal anonymous endpoints should be network-restricted in production (service mesh, firewall, or shared secret).

---

## 10. Catalog — `/api/catalog`

**Port:** 5006  

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/catalog` | **Anonymous** | List active catalog items. |
| POST | `/api/catalog` | JWT **Admin** | Create item (`CreateCatalogItemDto`). |

---

## 11. Redemptions — `/api/redemptions`

**Port:** 5006 · **Auth:** JWT

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/redemptions` | Redeem item (`CreateRedemptionDto`). |
| GET | `/api/redemptions/my` | Current user’s redemption history. |

---

## 12. Receipts — `/api/receipts`

**Port:** 5008 · **Auth:** JWT

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/receipts/transaction/{transactionId}` | Receipt JSON for a transaction. |
| GET | `/api/receipts/my` | All receipts for current user. |
| GET | `/api/receipts/transaction/{transactionId}/pdf` | PDF download. |
| GET | `/api/receipts/export/csv` | CSV export for user’s receipts. |

---

## 13. Admin — `/api/admin/...`

**Port:** 5009 · **Auth:** JWT **Admin**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/dashboard` | Dashboard stats (e.g. fraud flag counts). |
| POST | `/api/admin/transactions/{transactionId}/flag` | Create fraud flag (`FraudFlagDto`). |
| GET | `/api/admin/transactions/fraud-flags` | List fraud flags. |

---

## 14. Chatbot (Python / FastAPI)

**Port:** 8000 · **Not routed through Ocelot** in default repo config.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat` | Per deployment (configure API key / CORS) | Chat completion; see OpenAPI at `/docs`. |
| GET | `/health` | Anonymous | Health probe. |

---

## 15. Notification Service

**Port:** 5007 — primarily **event-driven**; any HTTP API surface is defined in that service’s Swagger (operational/email test endpoints if present).

---

## 16. Idempotency (API contract)

| Endpoint family | Header / field |
|-----------------|----------------|
| Wallet `topup` / `deduct` | JSON `idempotencyKey` (string). |
| Ledger `POST /transactions` | JSON `idempotencyKey` (optional; server may generate if empty). |
| Bill split pay | Server-built key `billsplit:{splitId}:{payerUserId}` (client does not pass). |

---

## 17. Document history

| Version | Date | Note |
|---------|------|------|
| 1.0 | 2026-04 | Generated from controllers + `ocelot.json` |

**Source of truth:** Controller attributes in `src/Services/*/Controllers` and Swagger UI. If code and this document differ, **trust the code** and update this file.
