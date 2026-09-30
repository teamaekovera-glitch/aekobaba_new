# Supabase Setup

Connect Aekobaba to a Supabase project: Postgres (via Prisma), Storage buckets,
and Auth providers. The app **builds and runs without credentials** — every
integration is config-only until real values land in `.env`.

## 1. Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick a region close to your users and set a strong database password.
   Save it — the connection strings below embed it.

## 2. Copy the connection strings

Open **Project Settings → Database → Connection string**. Supabase offers three
modes; this app uses two of them:

| Env var        | Mode                                  | Port | Used for                                  |
| -------------- | ------------------------------------- | ---- | ----------------------------------------- |
| `DATABASE_URL` | Transaction pooler (PgBouncer)        | 6543 | App runtime — the PrismaClient connection |
| `DIRECT_URL`   | Direct connection (or session pooler) | 5432 | Prisma CLI — migrations, Studio           |

Copy each URI into `.env` (start from the committed `.env.example`):

```bash
cp .env.example .env
```

```dotenv
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.<project-ref>:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

Why two URLs: the transaction pooler on 6543 is PgBouncer in transaction mode —
scalable connections for the running app, but it does not support the prepared
statements Prisma Migrate needs. Prisma 7 therefore points the **CLI** at the
direct connection through `prisma.config.ts` (`datasource.url` ← `DIRECT_URL`),
while the **runtime client** reads `DATABASE_URL` (the pooler) from the
environment.

## 3. Run migrations

```bash
npx prisma migrate deploy
```

The CLI resolves its connection from `prisma.config.ts` → `DIRECT_URL`. This
scaffold PR ships the datasource wiring only; the domain schema PR adds the
first real migrations. For local schema iteration you will use
`npx prisma migrate dev` once those migrations exist.

## 4. Create the Storage buckets

Dashboard → **Storage** → **New bucket** — create all three as **private**:

- `supplier-logos` — supplier brand marks
- `product-images` — product photography
- `artwork-uploads` — brand artwork attached to quote requests

## 5. Enable the Auth providers

Dashboard → **Authentication → Sign In / Up** and **Providers**:

- **Email** — enable; also enable **Magic Link** on the same page.
- **Google** — enable, then supply the OAuth client ID and secret from the
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
  Authorized redirect URI:
  `https://<project-ref>.supabase.co/auth/v1/callback`

## 6. Environment variables

Paste the remaining values from **Project Settings → API** into `.env`:

| Variable                        | Source                              | Notes                                                            |
| ------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL                         | Safe for the browser                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API keys → anon/publishable | Safe for the browser; constrained by Row Level Security          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Project API keys → service_role     | **Server only.** Bypasses RLS — never prefix with `NEXT_PUBLIC_` |

Complete `.env` checklist:

- [ ] `DATABASE_URL` — pooler, port **6543**
- [ ] `DIRECT_URL` — direct, port **5432**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

## 7. Verify

```bash
npm run build   # passes with or without credentials
npm run dev     # scaffold renders; Supabase features activate as later PRs land
```
