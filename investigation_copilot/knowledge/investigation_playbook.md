# WalletPlatform — Fraud & investigation playbook (reference)

## Purpose
This document guides analysts reviewing flagged activity. It is **reference material** for the investigation assistant. **Authoritative actions** (freeze, refund, legal) always require human approval in Admin tools.

## Fraud flag lifecycle
1. A transaction may be flagged with a **reason** and optional resolution notes.
2. **Unresolved** flags require triage; resolved flags are closed with a **resolution** string.
3. Dashboard metrics aggregate **total** fraud flags and **unresolved** counts.

## Triage checklist (high level)
- Confirm the **transaction ID** in the ledger matches the flag record.
- Review **amount**, **currency**, **type**, and **status** (e.g. Completed vs Failed).
- Correlate **sender and receiver wallet IDs**; investigate velocity and patterns outside this assistant’s scope.

## Escalation
- Suspected account takeover or mule activity: escalate per internal security policy.
- Regulatory or law-enforcement requests: follow legal/compliance process only through designated channels.

## Limits of automated assistance
- The assistant may summarize **retrieved** policy text and **read-only** API responses.
- It must **not** invent user balances, transaction IDs, or legal conclusions.
