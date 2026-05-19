# AutoIG

MVP foundation for an Instagram comment-to-DM automation SaaS.

## Stack

- `apps/web`: Next.js 16 + Tailwind CSS 4
- `apps/api`: Fastify + Prisma + BullMQ
- PostgreSQL for persistence
- Redis for queueing comment events and DM jobs

## What is implemented

- Email/password auth with JWT
- Instagram connection model and OAuth entry points
- Automation CRUD for post-specific comment triggers
- Meta webhook verification + intake endpoint
- Queue worker that matches comment events to automations and sends or simulates private replies
- Dashboard UI for auth, account connection state, automation creation, and summary metrics

## Local setup

1. Start infrastructure:

   ```bash
   docker compose up -d
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy env files:

   - `apps/api/.env.example` -> `apps/api/.env`
   - `apps/web/.env.local.example` -> `apps/web/.env.local`

4. Generate Prisma client and migrate:

   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

5. Run the app:

   ```bash
   pnpm dev
   pnpm dev:worker
   ```

## Meta integration notes

- Use `MOCK_INSTAGRAM_CONNECT=true` while the app review process is pending.
- The webhook endpoint is `GET/POST /webhooks/meta`.
- The DM worker is designed for comment-triggered private replies and defaults to simulation until real Meta credentials are present.
- Keep `META_GRAPH_VERSION` configurable because Meta versions roll forward frequently.
