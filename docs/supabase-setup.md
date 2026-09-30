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

The CLI resolves its connection from `prisma.config.ts` → `DIRECT_URL`. The
domain schema (users, suppliers, products, quotes, …) arrives with the first
migration; `npx prisma migrate dev` is for local schema iteration.

## 4. Create the role-lookup RPC

The role guard reads the signed-in user's role from the database at request
time — the DB is the source of truth, never the JWT. Edge middleware cannot
use Prisma, so it calls this SQL function over PostgREST instead. Run it in
Dashboard → **SQL Editor**:

```sql
-- Returns the caller's own role. Takes no arguments (only ever leaks your
-- own row), runs as the definer so it reads through RLS, and returns NULL
-- for unknown identities — the app treats NULL as "no access".
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role::text
  from public."User"
  where "supabaseUserId" = auth.uid()
    and role is not null;
$$;

grant execute on function public.current_user_role() to anon, authenticated;
```

Verify: `select public.current_user_role();` should return `NULL` (signed out)
or a role value once a signed-in user exists.

## 5. Create the Storage buckets

Dashboard → **Storage** → **New bucket** — create all three as **private**:

- `supplier-logos` — supplier brand marks
- `product-images` — product photography
- `artwork-uploads` — brand artwork attached to quote requests

## 6. Enable the Auth providers

Dashboard → **Authentication → Sign In / Up** and **Providers**:

- **Email** — enable; also enable **Magic Link** on the same page.
- **Google** — enable, then supply the OAuth client ID and secret from the
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
  Authorized redirect URI:
  `https://<project-ref>.supabase.co/auth/v1/callback`

Then under **Authentication → URL Configuration**, allow-list every origin the
app runs on — confirmation emails, magic links, and the Google round-trip all
return through `<origin>/auth/callback`, and Supabase rejects unlisted
redirect URLs:

- `http://localhost:3000` (local development)
- your production URL, e.g. `https://aekobaba.com`

## 7. Environment variables

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

## 8. Verify

```bash
npm run build   # passes with or without credentials
npm run dev     # scaffold renders; Supabase features activate as later PRs land
```


## 9. Launch checklist — user config required

Everything below needs a human with Supabase/Vercel access. The app ships and
builds without any of it (the dev harness and the SSE bridge keep every surface
working); these steps switch it to the real, live configuration. Nothing here is
faked by the code.

- [ ] **Create the Supabase project** (section 1) — takes ~5 minutes on the
      dashboard.
- [ ] **Paste the connection strings** into `.env` locally and into the Vercel
      project env vars: `DATABASE_URL` (pooler, 6543) and `DIRECT_URL` (5432)
      (section 2).
- [ ] **Run migrations against Supabase**: `npx prisma migrate deploy` with
      `DIRECT_URL` set (section 3).
- [ ] **Create the `current_user_role()` SQL function** (section 4) — the role
      guard queries it; without it every signed-in session resolves to BRAND
      only.
- [ ] **Create the three Storage buckets** — `supplier-logos`,
      `product-images`, `artwork-uploads` (section 5).
- [ ] **Enable the Auth providers** — Email (with confirmations), Magic Link,
      Google (needs a Google OAuth client id/secret) (section 6).
- [ ] **Add the production redirect URLs** to Supabase Auth URL Configuration:
      `https://<your-domain>/auth/callback` plus your preview URLs.
- [ ] **Seed the catalog**: `npm run db:seed` against the Supabase `DATABASE_URL`
      (idempotent — safe to re-run whenever the dataset is refreshed).
- [ ] **Set `NEXT_PUBLIC_SITE_URL`** in Vercel to the production domain so
      Open Graph URLs are absolute.
- [ ] **Import the Vercel project** (framework preset: Next.js) — see
      `DEPLOY.md` for the exact env-var list and build settings.
