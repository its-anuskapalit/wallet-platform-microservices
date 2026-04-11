# WalletPlatform — Technical documentation

This folder contains design and API documentation for **Aurelian / WalletPlatform**, aligned with the structure and tone of the repository root `README.md`.

| Document | Description |
|----------|-------------|
| [01-HighLevelDesign.md](./01-HighLevelDesign.md) | System context, architecture, services, data, security, NFRs |
| [02-LowLevelDesign.md](./02-LowLevelDesign.md) | Layers, flows, events, idempotency, component-level detail |
| [03-API-Reference.md](./03-API-Reference.md) | Gateway routes, REST endpoints, auth, errors |

### Exporting to Microsoft Word (`.docx`)

If you need `.docx` for submission or review, install [Pandoc](https://pandoc.org/) and run from the repo root:

```bash
pandoc documentation/01-HighLevelDesign.md -o documentation/WalletPlatform-HLD.docx
pandoc documentation/02-LowLevelDesign.md -o documentation/WalletPlatform-LLD.docx
pandoc documentation/03-API-Reference.md -o documentation/WalletPlatform-API-Reference.docx
```

---

**Version:** 1.0 · **Product:** WalletPlatform (Aurelian) · **Stack:** .NET 10, Angular, SQL Server, RabbitMQ
