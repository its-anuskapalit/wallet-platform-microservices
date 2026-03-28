# WalletPlatform

A production-grade **Wallet & Payment Platform** built with .NET 10 Microservices Architecture. Inspired by platforms like Paytm and PhonePe, this system handles user authentication, wallet management, transactions, rewards, KYC workflows, and real-time notifications.

---

## Architecture Overview

```
Client (Angular / Postman)
            │
            ▼
   API Gateway — :5000
   (Ocelot — routing, JWT validation)
            │
            ▼
┌───────────────────────────────────────────────────┐
│  Auth Service        :5001   JWT + Refresh Tokens  │
│  UserProfile Service :5002   Profile + KYC         │
│  Wallet Service      :5003   Balance + Idempotency  │
│  Ledger Service      :5004   Double-Entry Ledger    │
│  Rewards Service     :5005   Points + Tiers         │
│  Catalog Service     :5006   Items + Redemption     │
│  Notification Service:5007   Gmail SMTP             │
│  Receipts Service    :5008   History + CSV Export   │
│  Admin Service       :5009   Fraud + Dashboard      │
└───────────────────────────────────────────────────┘
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
| Framework | .NET 10, ASP.NET Core Web API |
| ORM | Entity Framework Core 10 (Code First) |
| Database | SQL Server Express |
| Authentication | JWT Bearer + Refresh Tokens |
| Message Bus | RabbitMQ + Dead Letter Queue |
| Email | MailKit + Gmail SMTP |
| Logging | Serilog (Console + Rolling File) |
| API Documentation | Swashbuckle 6.9.0 (Swagger UI) |
| API Gateway | Ocelot |
| Architecture | Clean Architecture (Core / Infrastructure / API) |
| Configuration | dotenv.net + appsettings.json |

---

## Microservices

| Service | Port | Database | Responsibility |
|---|---|---|---|
| Auth Service | 5001 | WalletPlatform_Auth | Registration, login, JWT, refresh tokens, roles |
| UserProfile Service | 5002 | WalletPlatform_UserProfile | Profile management, KYC workflow |
| Wallet Service | 5003 | WalletPlatform_Wallet | Wallet creation, balance, freeze/unfreeze |
| Ledger Service | 5004 | WalletPlatform_Ledger | Double-entry accounting, transaction lifecycle |
| Rewards Service | 5005 | WalletPlatform_Rewards | Points calculation, Bronze/Silver/Gold tiers |
| Catalog Service | 5006 | WalletPlatform_Catalog | Reward catalog, redemption |
| Notification Service | 5007 | WalletPlatform_Notification | Email notifications via Gmail SMTP |
| Receipts Service | 5008 | WalletPlatform_Receipts | Transaction receipts, CSV export |
| Admin Service | 5009 | WalletPlatform_Admin | Fraud flags, admin dashboard |

---

## Event-Driven Communication

Only 5 events use RabbitMQ — everything else is REST.

| Event | Publisher | Consumers |
|---|---|---|
| `UserRegistered` | Auth | Wallet, UserProfile, Notification |
| `KYCStatusUpdated` | UserProfile | Notification |
| `TransactionCompleted` | Ledger | Rewards, Receipts, Notification |
| `TransactionFailed` | Ledger | Notification |
| `WalletFrozen` | Wallet | Notification |

---

## Key Features

- **JWT Authentication** with role-based access (User / Admin)
- **Refresh Token Rotation** — secure token lifecycle
- **KYC Workflow** — Pending → Approved → Rejected with admin review
- **Idempotent Transactions** — duplicate requests return same result
- **Double-Entry Accounting** — every transaction creates debit + credit entries
- **Wallet Freeze/Unfreeze** — with event notification
- **Compensation Pattern** — simple transaction rollback on failure
- **Real Email Notifications** — Gmail SMTP via MailKit
- **Points & Tiers** — Bronze (0–999), Silver (1000–4999), Gold (5000+)
- **CSV Export** — transaction history download
- **Dead Letter Queue** — failed messages routed for inspection
- **API Gateway** — single entry point via Ocelot

---

## Project Structure

```
WalletPlatform/
├── src/
│   ├── Services/
│   │   ├── AuthService/
│   │   │   ├── AuthService.API
│   │   │   ├── AuthService.Core
│   │   │   ├── AuthService.Infrastructure
│   │   │   └── AuthService.Tests
│   │   ├── UserProfileService/
│   │   ├── WalletService/
│   │   ├── LedgerService/
│   │   ├── RewardsService/
│   │   ├── CatalogService/
│   │   ├── NotificationService/
│   │   ├── ReceiptsService/
│   │   └── AdminService/
│   ├── Gateway/
│   │   └── ApiGateway/
│   └── Shared/
│       ├── Shared.Common        ← BaseEntity, Result<T>
│       ├── Shared.Contracts     ← Event DTOs, Queue names
│       └── Shared.EventBus      ← RabbitMQ publisher + base consumer
├── frontend/
│   └── wallet-app/              ← Angular (coming soon)
├── .gitignore
├── .env.example
└── WalletPlatform.sln
```

---

## Getting Started

### Prerequisites

- .NET 10 SDK
- SQL Server Express
- RabbitMQ (or Docker)
- Gmail account with App Password enabled

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/WalletPlatform.git
cd WalletPlatform
```

### 2. Set up RabbitMQ

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3.13-management
```

Or install locally and enable the management plugin.

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

Copy `.env.example` to `.env` in each service API folder and fill in your values:

```env
ConnectionStrings__DefaultConnection=Data Source=SERVER\INSTANCE;Initial Catalog=DB_NAME;Integrated Security=True;Connect Timeout=30;Encrypt=True;TrustServerCertificate=True

Jwt__Key=your-secret-key-min-32-chars
Jwt__Issuer=WalletPlatform
Jwt__Audience=WalletPlatform.Clients
Jwt__ExpiryMinutes=60

RabbitMq__Host=localhost
RabbitMq__Port=5672
RabbitMq__Username=guest
RabbitMq__Password=guest

# Notification Service only
Smtp__FromEmail=your-email@gmail.com
Smtp__Password=your-16-char-app-password
Smtp__FromName=WalletPlatform
```

### 5. Run migrations for each service

```bash
cd src/Services/AuthService/AuthService.API

dotnet ef migrations add InitialCreate `
  --project ../AuthService.Infrastructure/AuthService.Infrastructure.csproj `
  --startup-project AuthService.API.csproj

dotnet ef database update `
  --project ../AuthService.Infrastructure/AuthService.Infrastructure.csproj `
  --startup-project AuthService.API.csproj
```

Repeat for each service changing the project paths.

### 6. Run all services

Open a separate terminal for each service:

```bash
# Terminal 1
cd src/Services/AuthService/AuthService.API && dotnet run

# Terminal 2
cd src/Services/UserProfileService/UserProfileService.API && dotnet run

# Terminal 3
cd src/Services/WalletService/WalletService.API && dotnet run

# Terminal 4
cd src/Services/LedgerService/LedgerService.API && dotnet run

# Terminal 5
cd src/Services/RewardsService/RewardsService.API && dotnet run

# Terminal 6
cd src/Services/CatalogService/CatalogService.API && dotnet run

# Terminal 7
cd src/Services/NotificationService/NotificationService.API && dotnet run

# Terminal 8
cd src/Services/ReceiptsService/ReceiptsService.API && dotnet run

# Terminal 9
cd src/Services/AdminService/AdminService.API && dotnet run

# Terminal 10 — Gateway last
cd src/Gateway/ApiGateway && dotnet run
```

---

## API Documentation

Each service exposes Swagger UI at `/swagger/index.html`:

| Service | Swagger URL |
|---|---|
| Auth | http://localhost:5001/swagger/index.html |
| UserProfile | http://localhost:5002/swagger/index.html |
| Wallet | http://localhost:5003/swagger/index.html |
| Ledger | http://localhost:5004/swagger/index.html |
| Rewards | http://localhost:5005/swagger/index.html |
| Catalog | http://localhost:5006/swagger/index.html |
| Receipts | http://localhost:5008/swagger/index.html |
| Admin | http://localhost:5009/swagger/index.html |

All services are also accessible via the API Gateway at `http://localhost:5000/gateway/{service}/...`

---

## API Gateway Routes

| Gateway URL | Downstream Service |
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
| Event Sourcing (lite) | Immutable ledger entries |

---

## Roadmap

- [x] Auth Service
- [x] UserProfile + KYC Service
- [x] Wallet Service
- [x] Ledger & Transaction Service
- [x] Rewards / Loyalty Service
- [x] Catalog & Redemption Service
- [x] Notification Service (Gmail SMTP)
- [x] Receipts & Statements Service
- [x] Admin Service
- [x] API Gateway (Ocelot)
- [ ] Fix RabbitMQ end-to-end bindings
- [ ] Unit Tests (xUnit + Moq)
- [ ] Angular Frontend
- [ ] Docker Compose
- [ ] CI/CD Pipeline

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

> Built with .NET 10 · Clean Architecture · Microservices · RabbitMQ · SQL Server
