# Database Schema

MM2-first delivery schema designed to scale across multiple Roblox games.

## Games (`GameType`)

| Value | Game |
|-------|------|
| `MM2` | Murder Mystery 2 (primary) |
| `ADOPT_ME` | Adopt Me |
| `SAB` | Steal a Brainrot |
| `GAG2` | Grow a Garden 2 |
| `OTHER` | Fallback / legacy |

## Core flow

```
Order → Claim → DeliveryJob → BotAssignment → BotAccount
         ↓
      ClaimItem → Product (per game + itemId)
```

## Key models

| Model | Purpose |
|-------|---------|
| `Product` | Catalog item scoped by `game` + `itemId` (unique) |
| `Order` / `OrderItem` | Purchase records |
| `Claim` / `ClaimItem` | Customer redemption via `claimCode` |
| `DeliveryJob` | Queue work unit (1:1 with `Claim`) |
| `BotAccount` | Delivery bot per game (no passwords stored) |
| `BotInventory` | Stock held by each bot |
| `BotAssignment` | Links bot ↔ claim during delivery |
| `DeliveryLog` / `InventoryLog` | Audit trails |
| `IdempotencyKey` | Safe retries for API actions |
| `AdminUser` | Admin auth (bcrypt password hash) |

## Commands

```bash
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Create/apply migrations (dev)
npm run db:seed       # Seed admin + MM2 bot
npm run db:push       # Push schema without migration (dev)
```

## Seed data

- **AdminUser** from `ADMIN_EMAIL` + `ADMIN_PASSWORD` (bcrypt hashed)
- **BotAccount** `radiomirrorq` for `MM2`, status `ONLINE`, `maxConcurrentDeliveries: 1`

No Roblox passwords are stored anywhere.
