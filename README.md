# RngBlox Delivery System

Scalable MVP for managing product deliveries with a queue-based architecture.

## Stack

- **Next.js 14** — App Router, TypeScript
- **Tailwind CSS** — UI styling
- **PostgreSQL + Prisma** — Data persistence
- **Redis + BullMQ** — Job queue
- **Zod** — Validation
- **bcrypt** — Admin password verification
- **Vitest** — Testing
- **Docker Compose** — Local Redis (PostgreSQL via Neon)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and set your **Neon** pooler URL:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

Get the connection string from the [Neon console](https://console.neon.tech) → your project → **Connect** → **Pooled connection**.

### 3. Start Redis (for BullMQ)

```bash
docker compose up -d
```

### 4. Set up database schema

```bash
npm run db:generate
npm run db:push
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Start the delivery worker (optional)

```bash
npm run worker
```

## Windows: Paths with spaces

If your project folder contains spaces (e.g. `D:\Roblox bot`), `npm run dev` and `npm run build` automatically use a temporary build directory. For best performance, clone the project into a path without spaces.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/claim` | Look up delivery by claim code |
| `/admin/login` | Admin authentication |
| `/admin` | Delivery dashboard |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run test` | Run Vitest tests |
| `npm run worker` | Start BullMQ delivery worker |

## Project Structure

```
app/              Next.js pages and API routes
components/       Shared UI components
lib/              Utilities, Prisma, Redis clients
server/
  adapters/       Delivery adapter implementations
  queues/         BullMQ queue definitions
  workers/        Background job processors
  services/       Business logic
  validators/     Zod schemas
prisma/           Database schema
scripts/          Utility scripts
tests/            Vitest test suites
docs/             Documentation
data/             Static data files
```

## Environment Variables

See `.env.example` for all required variables.

## Delivery Adapters

Set `DELIVERY_ADAPTER=mock` to use the mock adapter (default). Additional adapters can be added under `server/adapters/`.
