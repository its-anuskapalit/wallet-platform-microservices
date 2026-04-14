# WalletPlatform learning docs

Artifacts implementing the end-to-end study plan: runtime map, API inventory, vertical slices, cross-cutting behavior, and per-service cheat sheets.

| Doc | Purpose |
|-----|---------|
| [runtime-map.md](./runtime-map.md) | Ports, Ocelot routes, Angular `apiGatewayUrl`, service path prefixes |
| [api-inventory.md](./api-inventory.md) | Every controller route and auth requirement |
| [slice-auth.md](./slice-auth.md) | Login, register, OTP, JWT, interceptors, guards |
| [slice-wallet-ledger.md](./slice-wallet-ledger.md) | Top-up vs P2P transfer, Ledger + `TransactionCompleted` consumer |
| [cross-cutting.md](./cross-cutting.md) | EF boundaries, RabbitMQ matrix, idempotency, HTTP client integrations |
| [services/](./services/) | One-page cheat sheet per microservice (+ [api-gateway.md](./services/api-gateway.md)) |

Start with **runtime-map** and **api-inventory**, then read **slice-auth** and **slice-wallet-ledger**, then **cross-cutting** and the **services** folder for quick reference.
