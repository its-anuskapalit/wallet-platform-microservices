# WalletPlatform — Aurelian

A production-grade **Wallet & Loyalty Platform** built with .NET 10 Microservices, Angular 17, and a Python AI Chatbot. Inspired by platforms like Paytm and PhonePe, this system handles user authentication, KYC verification, wallet management, double-entry transactions, loyalty rewards, catalog redemption, PDF receipts, admin controls, and a conversational AI assistant.

---

## Architecture Overview

```
Browser (Angular 17 — :4200)
            │
            ▼
   API Gateway — :5000
   (Ocelot — routing, JWT validation)
            │
            ▼
┌─────────────────────────────────────────────────────┐
│  Auth Service         :5001   JWT + OTP via Email   │
│  UserProfile Service  :5002   Profile + KYC         │
│  Wallet Service       :5003   Balance + Freeze       │
│  Ledger Service       :5004   Double-Entry Ledger    │
│  Rewards Service      :5005   Points + Tiers         │
│  Catalog Service      :5006   Items + Redemption     │
│  Notification Service :5007   Gmail SMTP             │
│  Receipts Service     :5008   PDF + CSV Export       │
│  Admin Service        :5009   Fraud + Dashboard      │
│  Chatbot Service      :8000   Gemini AI (FastAPI)    │
└─────────────────────────────────────────────────────┘
            │
            ▼
     RabbitMQ Event Bus
            │
            ▼
   SQL Server (per-service DB)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 17 (standalone components, signals, lazy loading) |
| Backend | .NET 10, ASP.NET Core Web API |
| AI Chatbot | Python 3, FastAPI, Google Gemini (`gemini-2.5-flash`) |
| ORM | Entity Framework Core 10 (Code First) |
| Database | SQL Server Express (one DB per service) |
| Authentication | JWT Bearer + Refresh Tokens + OTP Email Verification |
| Message Bus | RabbitMQ + Dead Letter Queue |
| Email | MailKit 4.15.1 + Gmail SMTP |
| PDF Generation | QuestPDF |
| API Gateway | Ocelot |
| Logging | Serilog (Console + Rolling File) |
| API Docs | Swashbuckle 6.9 (Swagger UI) |
| Architecture | Clean Architecture (Core / Infrastructure / API) |
| Configuration | dotenv.net, appsettings.json, Python-dotenv |

---

## Microservices

| Service | Port | Database | Responsibility |
|---|---|---|---|
| Auth Service | 5001 | WalletPlatform_Auth | Registration, login, JWT, refresh tokens, OTP email verification |
| UserProfile Service | 5002 | WalletPlatform_UserProfile | Profile management, KYC workflow |
| Wallet Service | 5003 | WalletPlatform_Wallet | Wallet creation, balance, freeze/unfreeze (admin) |
| Ledger Service | 5004 | WalletPlatform_Ledger | Double-entry accounting, transaction lifecycle |
| Rewards Service | 5005 | WalletPlatform_Rewards | Points calculation, tier progression, self-healing account creation |
| Catalog Service | 5006 | WalletPlatform_Catalog | 12+ reward items, points check, redemption with voucher codes |
| Notification Service | 5007 | WalletPlatform_Notification | Email notifications via Gmail SMTP |
| Receipts Service | 5008 | WalletPlatform_Receipts | Transaction receipts, PDF generation, CSV export |
| Admin Service | 5009 | WalletPlatform_Admin | Fraud flags, user management, wallet freeze/unfreeze |
| Chatbot Service | 8000 | — | Gemini AI assistant (FastAPI + Python) |

---

## Angular Frontend

Located at `frontend/wallet-platform/`. Built with Angular 17 standalone components and signals.

### Pages

| Route | Description |
|---|---|
| `/home` | Public landing page (Aurelian brand, features, rewards info) |
| `/auth/login` | Login with JWT |
| `/auth/register` | Registration with OTP email verification |
| `/dashboard` | Balance, points, recent transactions (auto-refreshes on navigation) |
| `/wallet` | Top-up, send money by email, wallet details |
| `/transactions` | Full transaction history, +/- colour coding, PDF receipt download |
| `/rewards` | Available points, tier progress, points history |
| `/rewards` (Catalog tab) | Browse & redeem catalog items, voucher code modal |
| `/profile` | User profile, KYC submission |
| `/admin` | Admin panel — user list, wallet freeze/unfreeze, KYC approval |

### Key Frontend Features

- **Signals & computed state** throughout — no NgRx needed
- **Functional guards** (`authGuard`, `adminGuard`) with localStorage token fallback to prevent login buffering
- **Transaction colour coding** — green `+` for incoming / TopUp, red `−` for outgoing
- **Floating AI Chatbot widget** — available on all authenticated pages, supports conversation history, markdown rendering, typing indicator
- **Dashboard auto-refresh** — re-fetches wallet, points, and transactions on every `/dashboard` navigation
- **Rewards tabs** — Catalog / Points History / My Redemptions
- **Category filter pills** on the catalog
- **Voucher code success modal** after redemption
- **PDF receipt download** from transaction history

---

## Event-Driven Communication

| Event | Publisher | Consumers |
|---|---|---|
| `UserRegistered` | Auth | Wallet, UserProfile, Notification, Rewards |
| `KYCStatusUpdated` | UserProfile | Notification |
| `TransactionCompleted` | Ledger | Rewards, Receipts, Notification |
| `TransactionFailed` | Ledger | Notification |
| `WalletFrozen` | Wallet | Notification |

---

## Key Features

### Authentication & Security
- **JWT Authentication** with role-based access (User / Admin)
- **Refresh Token Rotation** — secure token lifecycle
- **OTP Email Verification** — 2-minute expiry, resend option, sent via MailKit/Gmail
- **MailKit 4.15.1** — upgraded from 4.7.1 to patch MimeKit moderate severity vulnerability (GHSA-g7hc-96xr-gvvx)

### Wallet & Transactions
- **Idempotent Transactions** — duplicate requests return same result
- **Double-Entry Accounting** — every transaction creates debit + credit ledger entries
- **Wallet Freeze/Unfreeze** — admin-controlled with event notification
- **Self-Healing Wallet Creation** — wallets auto-created on first access if RabbitMQ event was missed
- **PDF Receipts** — generated on-demand via QuestPDF
- **CSV Export** — full transaction history download

### Rewards & Loyalty
- **Welcome Bonus** — +10 points on registration
- **Transaction Points** — 1 point per ₹10 transferred
- **Big Transfer Bonus** — +50 points for transfers ≥ ₹1,000
- **High-Value Bonus** — +200 points for transfers ≥ ₹5,000
- **Tiers** — Bronze (0–499) → Silver (500–1,999) → Gold (2,000–4,999) → Platinum (5,000+)
- **Self-Healing Rewards Accounts** — auto-created if the `UserRegistered` event was missed
- **Available vs Total Points** — tracks redeemed points separately; display always shows available balance

### Catalog & Redemption
- **12+ catalog items** — Amazon vouchers (₹100–₹2,000), Swiggy, Zomato, Uber, Ola, Flipkart, Netflix, Spotify, BookMyShow, Myntra, and more
- **Points check before redemption** — CatalogService calls RewardsService internally
- **Instant voucher codes** — unique codes delivered on redemption
- **Stock tracking** — items show out-of-stock when exhausted
- **Redemption history** tab per user

### KYC
- **Multi-step KYC form** — document upload, admin review queue
- **Status workflow** — Pending → Approved / Rejected
- **Email notifications** on status change

### Admin Panel
- **User management** — view all users, KYC status
- **Wallet freeze / unfreeze** — inline action with confirmation
- **Fraud flagging** — via AdminService

### AI Chatbot (WalletBot)
- **Google Gemini** (`gemini-2.5-flash`) — conversational AI
- **Conversation history** — last 10 turns sent with each request for context
- **System prompt** — knows about WalletPlatform features, tiers, OTP, catalog categories
- **Floating widget** — available on all authenticated pages
- **Markdown rendering** — bold, italic, bullet lists in responses
- **Typing indicator**, unread badge, suggested questions
- **CORS** — configured for `http://localhost:4200` with `allow_credentials=False`

---

## Campaign / Rewards Logic Summary

| Trigger | Bonus |
|---|---|
| New user registers | +10 points (welcome bonus) |
| Any transfer | +1 pt per ₹10 |
| Transfer ≥ ₹1,000 | +50 bonus points |
| Transfer ≥ ₹5,000 | +200 bonus points |
| Catalog redemption | Points deducted from `availablePoints` |

---

## Project Structure

```
WalletPlatform/
├── chatbot_service/
│   ├── main.py              ← FastAPI app, Gemini integration
│   ├── .env                 ← GEMINI_API_KEY
│   ├── requirements.txt
│   └── venv/
├── frontend/
│   └── wallet-platform/     ← Angular 17 app
│       └── src/app/
│           ├── core/        ← services, guards, interceptors, models
│           ├── features/    ← dashboard, wallet, transactions, rewards,
│           │                   profile, admin, auth, landing
│           ├── layout/      ← main-layout, sidebar
│           └── shared/      ← chatbot widget
├── src/
│   ├── Services/
│   │   ├── AuthService/
│   │   │   ├── AuthService.API
│   │   │   ├── AuthService.Core
│   │   │   ├── AuthService.Infrastructure   ← MailKit, OTP entities
│   │   │   └── AuthService.Tests
│   │   ├── UserProfileService/
│   │   ├── WalletService/
│   │   ├── LedgerService/
│   │   ├── RewardsService/
│   │   ├── CatalogService/                  ← IRewardsClient, 12+ items
│   │   ├── NotificationService/
│   │   ├── ReceiptsService/                 ← QuestPDF
│   │   └── AdminService/
│   ├── Gateway/
│   │   └── ApiGateway/                      ← Ocelot
│   └── Shared/
│       ├── Shared.Common        ← BaseEntity, Result<T>
│       ├── Shared.Contracts     ← Event DTOs, Queue names
│       └── Shared.EventBus      ← RabbitMQ publisher + base consumer
├── start-all.ps1                ← One-command startup with health checks
├── .gitignore
├── .env.example
└── WalletPlatform.sln
```

---

## Getting Started

### Prerequisites

- .NET 10 SDK
- Node.js 20+ & Angular CLI 17
- Python 3.11+
- SQL Server Express
- RabbitMQ (or Docker)
- Gmail account with App Password enabled
- Google AI Studio API key (for chatbot)

### 1. Clone

```bash
git clone https://github.com/yourusername/WalletPlatform.git
cd WalletPlatform
```

### 2. Start RabbitMQ

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3.13-management
```

### 3. Create SQL Server databases

```sql
CREATE DATABASE [WalletPlatform_Auth];
CREATE DATABASE [WalletPlatform_UserProfile];
CREATE DATABASE [WalletPlatform_Wallet];
CREATE DATABASE [WalletPlatform_Ledger];
CREATE DATABASE [WalletPlatform_Rewards];
CREATE DATABASE [WalletPlatform_Catalog];
CREATE DATABASE [WalletPlatform_Notification];
CREATE DATABASE [WalletPlatform_Receipts];
CREATE DATABASE [WalletPlatform_Admin];
```

### 4. Configure environment variables

Each service has an `.env` or `appsettings.json`. Key variables:

```env
ConnectionStrings__DefaultConnection=Data Source=SERVER\INSTANCE;Initial Catalog=DB_NAME;Integrated Security=True;TrustServerCertificate=True

Jwt__Key=your-secret-key-min-32-chars
Jwt__Issuer=WalletPlatform
Jwt__Audience=WalletPlatform.Clients
Jwt__ExpiryMinutes=60

RabbitMq__Host=localhost
RabbitMq__Port=5672
RabbitMq__Username=guest
RabbitMq__Password=guest

# Notification / Auth Service — email
Smtp__FromEmail=your-email@gmail.com
Smtp__Password=your-16-char-app-password
Smtp__FromName=WalletPlatform
```

For the chatbot, create `chatbot_service/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_from_aistudio
```

### 5. Set up the chatbot Python environment

```powershell
cd chatbot_service
python -m venv venv
venv\Scripts\pip install -r requirements.txt
```

### 6. One-command startup (recommended)

```powershell
.\start-all.ps1
```

This script starts all .NET services, the API Gateway, the Chatbot, and the Angular frontend in separate windows, with health checks to ensure each service is healthy before proceeding.

### 7. Manual startup (alternative)

```bash
# .NET Services (one terminal each)
cd src/Services/AuthService/AuthService.API && dotnet run
cd src/Services/UserProfileService/UserProfileService.API && dotnet run
cd src/Services/WalletService/WalletService.API && dotnet run
cd src/Services/LedgerService/LedgerService.API && dotnet run
cd src/Services/RewardsService/RewardsService.API && dotnet run
cd src/Services/CatalogService/CatalogService.API && dotnet run
cd src/Services/NotificationService/NotificationService.API && dotnet run
cd src/Services/ReceiptsService/ReceiptsService.API && dotnet run
cd src/Services/AdminService/AdminService.API && dotnet run
cd src/Gateway/ApiGateway && dotnet run

# Chatbot
cd chatbot_service
venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Frontend
cd frontend/wallet-platform
npm install
ng serve
```

---

## API Documentation

Each service exposes Swagger UI at `/swagger/index.html`:

| Service | Swagger URL |
|---|---|
| Auth | http://localhost:5001/swagger |
| UserProfile | http://localhost:5002/swagger |
| Wallet | http://localhost:5003/swagger |
| Ledger | http://localhost:5004/swagger |
| Rewards | http://localhost:5005/swagger |
| Catalog | http://localhost:5006/swagger |
| Receipts | http://localhost:5008/swagger |
| Admin | http://localhost:5009/swagger |
| Chatbot | http://localhost:8000/docs |

All services are also accessible via the API Gateway at `http://localhost:5000/gateway/{service}/...`

---

## API Gateway Routes

| Gateway URL | Downstream |
|---|---|
| `/gateway/auth/{everything}` | Auth Service :5001 |
| `/gateway/profile/{everything}` | UserProfile Service :5002 |
| `/gateway/kyc/{everything}` | UserProfile Service :5002 |
| `/gateway/wallet/{everything}` | Wallet Service :5003 |
| `/gateway/transactions/{everything}` | Ledger Service :5004 |
| `/gateway/rewards/{everything}` | Rewards Service :5005 |
| `/gateway/catalog/{everything}` | Catalog Service :5006 |
| `/gateway/redemptions/{everything}` | Catalog Service :5006 |
| `/gateway/receipts/{everything}` | Receipts Service :5008 |
| `/gateway/admin/{everything}` | Admin Service :5009 |

---

## Architecture Patterns

| Pattern | Implementation |
|---|---|
| Clean Architecture | Core → Infrastructure → API layers per service |
| Repository Pattern | `IXRepository` / `XRepository` per entity |
| Service Pattern | `IXService` / `XDomainService` per domain |
| Result Pattern | `Result<T>` wrapper — no exceptions for business logic |
| DTO Pattern | No entities exposed via API |
| Base Consumer | All RabbitMQ consumers extend `BaseConsumer<T>` |
| Idempotency | `IdempotencyKey` entity in Wallet + Ledger |
| Database per Service | 9 separate SQL Server databases |
| Self-Healing | Wallet + Rewards accounts auto-created if events missed |
| Internal HTTP Calls | CatalogService → RewardsService via `IRewardsClient` |
| Event Sourcing (lite) | Immutable ledger entries |

---

## Roadmap

- [x] Auth Service — JWT, refresh tokens, OTP email verification
- [x] UserProfile + KYC Service
- [x] Wallet Service — balance, freeze/unfreeze, self-healing
- [x] Ledger & Transaction Service — double-entry, idempotency
- [x] Rewards / Loyalty Service — points, tiers, campaign engine, self-healing
- [x] Catalog & Redemption Service — 12+ items, voucher codes, stock tracking
- [x] Notification Service — Gmail SMTP (OTP + transactional emails)
- [x] Receipts Service — PDF generation (QuestPDF), CSV export
- [x] Admin Service — user/KYC/wallet management
- [x] API Gateway (Ocelot)
- [x] RabbitMQ end-to-end bindings + Dead Letter Queue
- [x] Campaign / Rewards engine (signup bonus, transfer milestones)
- [x] Angular 17 Frontend — full UI with signals
- [x] AI Chatbot (Gemini `gemini-2.5-flash` via FastAPI)
- [x] One-command startup script (`start-all.ps1`)
- [x] Public landing page (Aurelian brand)
- [ ] Docker Compose
- [ ] CI/CD Pipeline
- [ ] Unit & Integration Tests (xUnit + Moq)

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

> Built with .NET 10 · Angular 17 · FastAPI · Gemini AI · Clean Architecture · Microservices · RabbitMQ · SQL Server
