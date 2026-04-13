# WalletPlatform — High-Level Design (HLD)

**Document:** High-Level Design  
**Product:** Aurelian / WalletPlatform  
**Architecture style:** Microservices, event-driven integration, API gateway  
**Version:** 1.0  

---

## 1. Purpose and scope

This document describes the **logical and physical architecture** of WalletPlatform: major components, communication patterns, data ownership, and cross-cutting concerns. It is intended for architects, tech leads, and new engineers onboarding to the system.

**In scope:** Backend microservices, API gateway, message bus, databases, Angular SPA, Python chatbot (adjacent), and their interactions.  
**Out of scope:** Detailed class diagrams, OpenAPI field-level schemas (see API Reference), infrastructure-as-code for specific cloud vendors unless noted as future work.

---

## 2. System context

### 2.1 Actors

| Actor | Interaction |
|-------|-------------|
| **End user (browser)** | Uses the Angular SPA for wallet, KYC, rewards, admin (if role allows). |
| **Administrator** | Same SPA with elevated role; admin APIs. |
| **External email (SMTP)** | Outbound OTP and transactional mail (Gmail / SMTP). |
| **Google Gemini API** | Optional AI chatbot (FastAPI service). |

### 2.2 Context diagram (logical)

```
                    ┌─────────────────┐
                    │  Google Gemini  │◄─── FastAPI Chatbot :8000
                    └────────▲────────┘
                             │
┌──────────┐    HTTPS      ┌──────────────┐     HTTP      ┌─────────────────────┐
│  User    │──────────────►│ Angular SPA  │──────────────►│ API Gateway :5000   │
│ (Browser)│   :4200       │  (static)    │   /gateway/*  │ (Ocelot + JWT)      │
└──────────┘               └──────────────┘               └──────────┬──────────┘
                                                                       │
                     ┌─────────────────────────────────────────────────┼──────────────────────────────┐
                     │                                                 │                              │
                     ▼                                                 ▼                              ▼
              Auth :5001                                      Ledger :5004                     Admin :5009
              Profile :5002                                   Rewards :5005                    …
              Wallet :5003                                    Catalog :5006
              Notification :5007                              Receipts :5008

                     │                                                 │
                     └─────────────────────┬───────────────────────────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │   RabbitMQ     │
                                  │ (direct/fanout)│
                                  └────────┬───────┘
                                           │
                     ┌─────────────────────┴─────────────────────┐
                     ▼                     ▼                     ▼
              SQL Server (per service)   Consumers (wallet balance, rewards, receipts, notifications)
```

---

## 3. Architectural principles

| Principle | Implementation |
|-----------|----------------|
| **Database per service** | Each microservice owns its SQL Server schema; no shared tables across boundaries. |
| **Clean Architecture** | Core (domain) → Infrastructure (EF, RabbitMQ, HTTP clients) → API (controllers). |
| **API composition** | Clients call **Ocelot** (`/gateway/...`); downstream hosts are hidden from the browser. |
| **Async domain events** | Critical side effects (wallet debit/credit, points, receipts, email) driven by **RabbitMQ** after ledger commits. |
| **Idempotency** | Wallet top-up/deduct and ledger initiation use **idempotency keys** to tolerate retries. |
| **Defense in depth** | JWT on protected routes; gateway validates token; services enforce user-scoped data access. |

---

## 4. Service catalog

| Service | Port | Database | Primary responsibility |
|---------|------|----------|------------------------|
| **ApiGateway** | 5000 | — | Route `/gateway/*` to services; JWT validation. |
| **AuthService** | 5001 | WalletPlatform_Auth | Register, login, refresh, revoke, OTP, password change. |
| **UserProfileService** | 5002 | WalletPlatform_UserProfile | Profile CRUD, email lookup, KYC submit/review. |
| **WalletService** | 5003 | WalletPlatform_Wallet | Wallet lifecycle, balance (via events), top-up/deduct, freeze, bill split. |
| **LedgerService** | 5004 | WalletPlatform_Ledger | Double-entry transactions, completion/failure events. |
| **RewardsService** | 5005 | WalletPlatform_Rewards | Points, tiers, history; consumes transaction events. |
| **CatalogService** | 5006 | WalletPlatform_Catalog | Catalog items, redemption, voucher codes; calls Rewards internally. |
| **NotificationService** | 5007 | WalletPlatform_Notification | Email notifications (consumes multiple event types). |
| **ReceiptsService** | 5008 | WalletPlatform_Receipts | Receipt storage, PDF (QuestPDF), CSV export. |
| **AdminService** | 5009 | WalletPlatform_Admin | Dashboard, fraud flags, aggregated admin operations. |
| **Chatbot (Python)** | 8000 | — | Conversational UI helper; not on critical payment path. |

---

## 5. High-level data architecture

- **Persistence:** Microsoft SQL Server; **EF Core** code-first migrations per service.
- **Ownership:** Only the owning service writes to its database; other services integrate via **HTTP** or **events**, not cross-DB joins.
- **Read models:** UI aggregates data from multiple gateway calls (e.g. dashboard: wallet + transactions + rewards + profile).

### 5.1 Conceptual data domains

| Domain | Owning service | Examples |
|--------|----------------|----------|
| Identity & tokens | Auth | Users, refresh tokens, OTP records. |
| Profile & KYC | UserProfile | Profile fields, KYC status, document metadata. |
| Wallet aggregate | Wallet | Wallet row, bill split aggregates, idempotency cache. |
| Financial truth | Ledger | Transactions, ledger entries, statuses. |
| Loyalty | Rewards | Accounts, point history, tier. |
| Commerce | Catalog | Items, stock, redemptions. |
| Artifacts | Receipts | Receipt rows linked to transaction IDs. |
| Compliance / ops | Admin | Fraud flags, audit-oriented views. |

---

## 6. Communication patterns

### 6.1 Synchronous (HTTP/HTTPS)

- **Browser → Gateway → Service:** JSON REST; `Authorization: Bearer <JWT>` for protected resources.
- **Service → Service (controlled):** Example: **WalletService → LedgerService** for bill-split pay; **CatalogService → RewardsService** for point checks/deductions.

### 6.2 Asynchronous (RabbitMQ)

| Pattern | Usage |
|---------|--------|
| **Direct exchange + routing key** | Transaction lifecycle, wallet freeze, KYC updates, user registration fan-out. |
| **Fanout (publisher)** | Some broadcast-style user events (per `Shared.EventBus` configuration). |
| **Dead-letter queue** | Failed message handling; operational visibility. |

**Illustrative event outcomes**

| Event (concept) | Typical consumers |
|-----------------|-------------------|
| User registered | Wallet creation, profile bootstrap, notification, rewards account. |
| Transaction completed | Wallet balance adjust, rewards points, receipt write, notification. |
| Transaction failed | Notification. |
| Wallet frozen | Notification. |
| KYC status updated | Notification. |

*(Exact exchange/queue names are defined in `Shared.Contracts` / infrastructure.)*

---

## 7. Security architecture (high level)

| Layer | Mechanism |
|-------|-----------|
| **Transport** | HTTPS recommended in production; local dev often HTTP. |
| **Authentication** | JWT access token; refresh token rotation for session extension. |
| **Authorization** | Role claims (e.g. Admin); service-level checks on sensitive operations. |
| **Gateway** | Central place to validate JWT before forwarding (Ocelot configuration). |
| **Secrets** | Configuration via environment / user secrets / Key Vault (production target); not committed credentials. |

---

## 8. Frontend (SPA) architecture

- **Framework:** Angular (standalone components, signals).
- **Integration:** Calls gateway base URL; functional route guards (`auth`, `admin`).
- **Cross-cutting:** HTTP error interceptor, toast notifications, optional AI widget (separate origin).

---

## 9. Non-functional requirements (NFR) — targets

| NFR | Approach |
|-----|----------|
| **Availability** | Stateless APIs; DB and RabbitMQ are single points to scale/replicate in production. |
| **Scalability** | Horizontal scale of API instances; partition read load with caching (future). |
| **Consistency** | Strong consistency within each service DB; **eventual** consistency across services (e.g. wallet balance after event processing). |
| **Observability** | Serilog logging; per-service logs; Swagger for contract discovery. |
| **Testability** | xUnit test projects per service; frontend E2E optional. |

---

## 10. Deployment view (reference)

| Environment | Notes |
|-------------|--------|
| **Local** | `start-all.ps1` starts gateway, services, frontend, chatbot; SQL + RabbitMQ local or Docker. |
| **Container (future)** | `docker/` assets for SQL + RabbitMQ; full mesh needs Ocelot downstream hostnames aligned with compose network. |
| **CI (future)** | Jenkinsfile / `dotnet test` on `WalletPlatform.slnx`. |

---

## 11. Risks and technical debt (honest view)

- **Secrets in config:** SMTP and similar must move to secure stores for production.
- **OTP storage:** Should be hashed, rate-limited, and never logged in clear text in production builds.
- **CORS / Ocelot:** Tighten allowed origins for non-local deployments.
- **End-to-end consistency:** Wallet balance depends on consumer success; operations playbooks should cover DLQ and reconciliation.

---

## 12. Glossary

| Term | Meaning |
|------|---------|
| **Gateway** | Ocelot reverse proxy + auth at `:5000`. |
| **Idempotency key** | Client/server key so duplicate submits return the same outcome. |
| **Double-entry** | Ledger records offsetting debit/credit lines per transaction. |
| **DLQ** | Dead-letter queue for poison/failed messages. |

---

## 13. Document history

| Version | Date | Author / note |
|---------|------|----------------|
| 1.0 | 2026-04 | Derived from codebase and root README |
