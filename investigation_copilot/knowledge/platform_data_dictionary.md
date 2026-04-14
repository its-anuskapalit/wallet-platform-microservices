# WalletPlatform — Data fields (investigation context)

## Admin dashboard (`/api/admin/dashboard`)
- **FraudFlags**: Count of all fraud-flag records.
- **UnresolvedFraudFlags**: Count of flags not yet marked resolved.

## Fraud flags (`/api/admin/transactions/fraud-flags`)
Each flag typically includes:
- **transactionId**: Links to the ledger transaction under review.
- **reason**: Analyst- or system-provided reason text.
- **isResolved** / **resolution**: Closure state and notes.
- **createdAt**: When the flag was raised.

## Ledger transaction (`/api/transactions/{transactionId}`)
Common fields returned:
- **id**: Transaction identifier (GUID).
- **senderWalletId** / **receiverWalletId**: Wallet identifiers involved in the movement.
- **amount**, **currency**: Value and ISO currency code (e.g. INR).
- **type**: e.g. Transfer.
- **status**: e.g. Completed.
- **createdAt**: UTC timestamp.

**Note:** User IDs for parties may not appear in all DTOs; use wallet IDs and related services for deeper identity context when permitted.
