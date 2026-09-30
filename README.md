# Aekobaba Packaging Marketplace

A B2B marketplace where CPG brands find source-verified packaging products and
send one multi-supplier quote request. Every price, MOQ, and lead time is a
verified, dated snapshot from the supplier's own public page — when a supplier
doesn't publish something, the UI says "Ask the supplier", never an estimate.

This is the **foundation scaffold** PR: stack, env contract, and CI gates. The
domain schema, brand journey, and Quote Basket land in subsequent PRs per the
build spec.

## Stack

- Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS
- Prisma 7 over Supabase Postgres
- Supabase — Auth, Storage, Realtime (wired in later PRs)
- Zod validation · Vitest tests
- GitHub Actions CI — lint, typecheck, test, build on every PR to `main`

## Local development

**Prerequisites:** Node.js 20+, npm 10+.

```bash
npm install

# Environment (no credentials needed to build and run the scaffold)
cp .env.example .env
# → fill real values per docs/supabase-setup.md when connecting Supabase

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command                | What it does               |
| ---------------------- | -------------------------- |
| `npm run dev`          | Dev server (Turbopack)     |
| `npm run build`        | Production build           |
| `npm run start`        | Serve the production build |
| `npm run lint`         | ESLint                     |
| `npm run typecheck`    | `tsc --noEmit`             |
| `npm test`             | Vitest (single run)        |
| `npm run test:watch`   | Vitest watch mode          |
| `npm run format`       | Prettier — write           |
| `npm run format:check` | Prettier — check           |

## Supabase setup

See [docs/supabase-setup.md](docs/supabase-setup.md): project creation,
connection strings (pooler **6543** for the app, direct **5432** for
migrations), `prisma migrate deploy`, the three Storage buckets
(`supplier-logos`, `product-images`, `artwork-uploads`), and Auth providers
(Email, Magic Link, Google).

## CI

Every PR to `main` runs lint, typecheck, test, and build — see
[.github/workflows/ci.yml](.github/workflows/ci.yml).
