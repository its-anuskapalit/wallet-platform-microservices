# WalletPlatform runtime map

Reference for local development: gateway, downstream services, Angular base URL, and how paths line up.

## Ports (from `launchSettings.json` + Ocelot)

| Process | Port | Role |
|--------|------|------|
| ApiGateway | **5000** | Ocelot; `GlobalConfiguration.BaseUrl` is `http://localhost:5000` |
| AuthService.API | **5001** | Identity / JWT issuance |
| UserProfileService.API | **5002** | Profile + KYC (`/api/profile`, `/api/kyc`) |
| WalletService.API | **5003** | Wallets, transfers, bill split |
| LedgerService.API | **5004** | Transactions / ledger entries |
| RewardsService.API | **5005** | Rewards |
| CatalogService.API | **5006** | Catalog + redemptions (`/api/catalog`, `/api/redemptions`) |
| NotificationService.API | **5007** | Not exposed via Ocelot in this repo; consumers/internal only |
| ReceiptsService.API | **5008** | Receipts |
| AdminService.API | **5009** | Admin dashboard / transactions |

Infrastructure (see `docker/docker-compose.yml`):

- SQL Server: `localhost:1433`
- RabbitMQ: AMQP `5672`, management UI `15672`

## Ocelot upstream → downstream

Upstream paths are what the browser (via Angular) calls on the gateway. Downstream strips the gateway prefix and hits each API’s `/api/...` routes.

| Gateway upstream | Downstream host:port | Downstream path template |
|------------------|----------------------|---------------------------|
| `/gateway/auth/{everything}` | localhost:5001 | `/api/auth/{everything}` |
| `/gateway/profile/{everything}` | localhost:5002 | `/api/profile/{everything}` |
| `/gateway/kyc/{everything}` | localhost:5002 | `/api/kyc/{everything}` |
| `/gateway/wallet/{everything}` | localhost:5003 | `/api/wallet/{everything}` |
| `/gateway/transactions/{everything}` | localhost:5004 | `/api/transactions/{everything}` |
| `/gateway/rewards/{everything}` | localhost:5005 | `/api/rewards/{everything}` |
| `/gateway/catalog/{everything}` | localhost:5006 | `/api/catalog/{everything}` |
| `/gateway/redemptions/{everything}` | localhost:5006 | `/api/redemptions/{everything}` |
| `/gateway/receipts/{everything}` | localhost:5008 | `/api/receipts/{everything}` |
| `/gateway/admin/{everything}` | localhost:5009 | `/api/admin/{everything}` |

All listed routes allow `GET`, `POST`, `PUT`, `DELETE`.

Source: `src/Gateway/ApiGateway/ocelot.json`.

## Angular `apiGatewayUrl`

| Build | `apiGatewayUrl` | Effective example |
|-------|-----------------|-------------------|
| Development | `http://localhost:5000/gateway` | `POST http://localhost:5000/gateway/auth/login` → Auth `5001` |
| Production | `/gateway` | Same paths, relative to the site origin (needs reverse proxy to port 5000 or container network) |

Files: `frontend/wallet-platform/src/environments/environment.ts`, `environment.production.ts`.

## Angular service path prefixes (append to `apiGatewayUrl`)

These match the first segment after `/gateway` in Ocelot:

| Angular service file | Path prefix(es) after `apiGatewayUrl` |
|----------------------|--------------------------------------|
| `auth.service.ts` | `/auth` |
| `profile.service.ts` | `/profile`, `/kyc` |
| `wallet.service.ts` | `/wallet` |
| `transaction.service.ts` | `/transactions` |
| `rewards.service.ts` | `/rewards`, `/catalog`, `/redemptions` |
| `bill-split.service.ts` | `/wallet/billsplit` (still under wallet downstream) |
| `receipt.service.ts` | `/receipts` |
| `admin.service.ts` | `/admin`, `/profile`, `/wallet` |

SPA routes (features): `frontend/wallet-platform/src/app/app.routes.ts` (`/auth/login`, `/dashboard`, `/wallet`, `/transactions`, etc.).

## CORS

Gateway allows origin `http://localhost:4200` for Angular dev (`ApiGateway/Program.cs`).
