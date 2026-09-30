# Deploying Aekobaba

Single Next.js 15 (App Router) app on Vercel; Postgres, Auth, Storage, and
Realtime come from Supabase. `vercel.json` pins the Next.js framework preset
and the `iad1` region.

## One-time setup

1. Work through **docs/supabase-setup.md** — the Supabase project, migrations,
   role RPC, Storage buckets, and Auth providers. Section 9 there is the
   user-config launch checklist.
2. Import this repo into Vercel. Framework preset **Next.js** (set by
   `vercel.json`); build command `npm run build` (the default); install
   command `npm ci` (the default — it runs `prisma generate` via postinstall).

## Environment variables (Vercel → Settings → Environment Variables)

| Variable                        | Scope            | Notes                                                                       |
| ------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`                  | Runtime          | Supabase **pooler** connection string, port **6543** (transaction mode)     |
| `DIRECT_URL`                    | Build/CLI        | Supabase **direct** connection, port **5432** — used by Prisma migrations   |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client + server  | Supabase project URL                                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server  | Anon key — access constrained by Row Level Security                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only      | Bypasses RLS — never expose to the browser                                  |
| `NEXT_PUBLIC_SITE_URL`          | Client + server  | Production URL (e.g. `https://app.aekobaba.com`) — absolute OG/metadata URLs |

Secrets live in the Vercel project, never in the repo. `.env.example` mirrors
the same list for local development.

## Migrations

Prisma migrations are applied from a machine with `DIRECT_URL` set:

```bash
npx prisma migrate deploy
npm run db:seed   # idempotent — updates in place, keyed on supplier slug + product title
```

There is no migration step in the Vercel build: schema changes ship through
`prisma migrate deploy` (run manually or from CI), then the deploy picks them
up. The build itself needs no database.

## What is degraded without Supabase credentials

Until the launch checklist is completed, deploys still build and serve public
catalog pages only if `DATABASE_URL` points at a reachable Postgres. Auth
sessions, Storage uploads, and Realtime status pushes stay inactive without
`NEXT_PUBLIC_SUPABASE_URL` + keys — the app's dev harness and the SSE bridge
(documented in the code) are development-time fallbacks, not deploy targets.
