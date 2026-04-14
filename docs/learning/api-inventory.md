# HTTP API inventory (controllers)

Downstream paths are under each service’s base URL (e.g. `http://localhost:5001`). Through the gateway, prefix with `http://localhost:5000/gateway` and the segment from [runtime-map.md](./runtime-map.md) (`/auth`, `/profile`, …).

**Swagger:** Each `*Service.API` enables Swagger in Development; typical UI URL is `{serviceBase}/swagger` (e.g. `http://localhost:5001/swagger`). OpenAPI should match the tables below.

---

## AuthService — `api/auth` (port 5001)

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| POST | `api/auth/register` | Anonymous | Returns tokens |
| POST | `api/auth/login` | Anonymous | |
| POST | `api/auth/refresh` | Anonymous | Body: refresh token |
| POST | `api/auth/revoke` | JWT | |
| GET | `api/auth/me` | JWT | Claims summary |
| POST | `api/auth/change-password` | JWT | |
| POST | `api/auth/send-otp` | Anonymous | Email + phone |
| POST | `api/auth/verify-otp` | Anonymous | |
| GET | `api/auth/admin-only` | JWT, **Admin** | Smoke test |

---

## UserProfileService — `api/profile` (port 5002)

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| GET | `api/profile` | JWT | Get or create profile |
| PUT | `api/profile` | JWT | Update |
| GET | `api/profile/lookup?email=` | JWT | Resolve email → profile |
| GET | `api/profile/admin/all` | JWT, **Admin** | Paginated |

### KYC — `api/kyc` (same service)

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| POST | `api/kyc/submit` | JWT | |
| POST | `api/kyc/review/{userProfileId}` | JWT, **Admin** | |

---

## WalletService — `api/wallet` (port 5003)

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| GET | `api/wallet` | JWT | Current user wallet |
| GET | `api/wallet/lookup/{userId}` | JWT | Recipient wallet by user id |
| POST | `api/wallet/topup` | JWT | Idempotency key in body |
| POST | `api/wallet/deduct` | JWT | Idempotency key in body |
| POST | `api/wallet/admin/freeze/{userId}` | JWT, **Admin** | |
| POST | `api/wallet/admin/unfreeze/{userId}` | JWT, **Admin** | |

### Bill split — `api/wallet/billsplit`

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| POST | `api/wallet/billsplit` | JWT | Create |
| GET | `api/wallet/billsplit/created` | JWT | |
| GET | `api/wallet/billsplit/owed` | JWT | |
| POST | `api/wallet/billsplit/{id}/pay` | JWT | Forwards `Authorization` header internally |

---

## LedgerService — `api/transactions` (port 5004)

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| POST | `api/transactions` | JWT | Initiate transfer; sets `SenderUserId` from JWT |
| GET | `api/transactions/summary` | JWT | |
| GET | `api/transactions/{transactionId}` | JWT | |
| GET | `api/transactions/my` | JWT | Pagination query params |

---

## RewardsService — `api/rewards` (port 5005)

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| GET | `api/rewards` | JWT | Current user rewards |
| GET | `api/rewards/history` | JWT | |
| GET | `api/rewards/account/{userId}` | **AllowAnonymous** | Server-to-server from Catalog |
| POST | `api/rewards/deduct` | **AllowAnonymous** | Server-to-server from Catalog |

---

## CatalogService — `api/catalog` & `api/redemptions` (port 5006)

### Catalog

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| GET | `api/catalog` | **AllowAnonymous** | List active items |
| POST | `api/catalog` | JWT, **Admin** | Create item |

### Redemptions

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| POST | `api/redemptions` | JWT | Redeem item |
| GET | `api/redemptions/my` | JWT | History |

---

## ReceiptsService — `api/receipts` (port 5008)

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| GET | `api/receipts/transaction/{transactionId}` | JWT | |
| GET | `api/receipts/my` | JWT | |
| GET | `api/receipts/transaction/{transactionId}/pdf` | JWT | PDF download |
| GET | `api/receipts/export/csv` | JWT | CSV export |

---

## AdminService — `api/admin/...` (port 5009)

| Method | Route | Auth | Notes |
|--------|-------|------|--------|
| GET | `api/admin/dashboard` | JWT, **Admin** | Fraud stats summary |
| POST | `api/admin/transactions/{transactionId}/flag` | JWT, **Admin** | Create fraud flag |
| GET | `api/admin/transactions/fraud-flags` | JWT, **Admin** | List flags |

---

## NotificationService (port 5007)

No MVC controllers in repo; service runs as worker/API for messaging only (see cross-cutting doc).
