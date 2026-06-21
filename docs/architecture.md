# RngBlox Delivery System — Documentation

## Architecture Overview

```
Client (Browser)
    │
    ├── /claim ──► API ──► PostgreSQL (delivery lookup)
    │
    └── /admin ──► API ──► PostgreSQL (stats, sessions)
                              │
                              └── BullMQ Queue ──► Worker ──► Delivery Adapter
                                        │
                                     Redis
```

## Core Concepts

### Deliveries

Each delivery has a unique claim code, product name, and status (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).

### Queue Processing

New deliveries are enqueued via BullMQ. A separate worker process picks up jobs and invokes the configured delivery adapter.

### Adapters

Delivery adapters implement the `DeliveryAdapter` interface in `server/adapters/`. The mock adapter simulates successful deliveries for development.

### Admin Sessions

Admin login creates a session token stored in PostgreSQL and set as an HTTP-only cookie. Sessions expire after 24 hours.

## Adding a New Delivery Adapter

1. Create a new file in `server/adapters/`.
2. Implement the `DeliveryAdapter` interface.
3. Register it in `createDeliveryAdapter()`.
4. Add the adapter name to the `DELIVERY_ADAPTER` enum in `lib/env.ts`.

## Folder Conventions

- `app/` — Next.js routes only; keep business logic in `server/`
- `server/services/` — Orchestration and business rules
- `server/adapters/` — External delivery integrations
- `server/validators/` — Zod input schemas shared by API and services
