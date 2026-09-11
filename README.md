# SimpleDir

Desktop file manager for **Cloudflare R2** (Mac & Windows) with a free serverless auth API on **Vercel**.

- Register / verify email / login (JWT)
- Save multiple labeled R2 credentials (encrypted at rest in Neon)
- Browse, upload (drag & drop), download, delete objects directly against R2

## Monorepo layout

```
apps/api       Next.js API → deploy to Vercel
apps/desktop   Tauri 2 + React desktop app
packages/shared  Shared Zod schemas & types
```

## Prerequisites

- Node.js 20+
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.15.9 --activate`)
- Rust (for Tauri): https://rustup.rs
- PostgreSQL locally **or** [Neon](https://neon.tech) for cloud
- Optional free accounts later: [Resend](https://resend.com), [Vercel](https://vercel.com), Cloudflare R2

## 1. API setup

```bash
cp apps/api/.env.example apps/api/.env
```

Fill in:

| Variable | Notes |
|----------|--------|
| `DATABASE_URL` | Local: `postgresql://USER@localhost:5432/simpledir` — or a Neon URL later |
| `JWT_SECRET` | Long random string |
| `CREDENTIALS_ENCRYPTION_KEY` | 64 hex chars (32 bytes), e.g. `openssl rand -hex 32` |
| `SMTP_HOST` / `SMTP_PORT` | Local MailHog: `localhost` / `1025` (UI at `http://localhost:8025`) |
| `RESEND_API_KEY` | Production email (used when `SMTP_HOST` is unset) |
| `EMAIL_FROM` | Any address locally; verified domain sender with Resend |
| `APP_URL` | Public API URL (local: `http://localhost:3001`) |
| `CORS_ORIGIN` | `*` for local, or lock down later |

### Local Postgres

```bash
createdb simpledir   # or: psql -d postgres -c 'CREATE DATABASE simpledir;'
pnpm install
pnpm db:migrate
```

The API uses the standard `pg` driver, so the same code works with local Postgres and Neon.

Run locally:

```bash
pnpm dev:api
```

Deploy `apps/api` to Vercel and set the same env vars. Point `APP_URL` at the Vercel URL.

### API endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/auth/register` | — |
| POST | `/api/auth/verify-email` | — |
| GET | `/verify?token=…` | browser verify page |
| POST | `/api/auth/login` | — |
| POST | `/api/auth/refresh` | — |
| POST | `/api/auth/logout` | — |
| GET | `/api/me` | Bearer |
| GET/POST | `/api/credentials` | Bearer |
| GET/PATCH/DELETE | `/api/credentials/:id` | Bearer (`GET` returns decrypted secrets) |

File bytes never go through this API — the desktop app talks to R2 with the decrypted keys.

## 2. Desktop app

```bash
pnpm --filter @simpledir/desktop install
pnpm dev:desktop
```

On first login/register screens, expand **API settings** and set the API base URL (`http://localhost:3001` or your Vercel URL).

Build installers:

```bash
pnpm build:desktop
```

Artifacts land under `apps/desktop/src-tauri/target/release/bundle/`.

## Product flow

1. Register → open verification link from email → account becomes `active`
2. Login → land on credential labels
3. Add R2 Access Key (Account ID, bucket, access key, secret) with a label
4. Open a label → file browser with drag & drop upload

## Security notes

- Passwords hashed with bcrypt
- Verification & refresh tokens stored hashed
- R2 secrets encrypted with AES-256-GCM using `CREDENTIALS_ENCRYPTION_KEY`
- Threat model v1: server operator can decrypt R2 secrets; keep the key only in Vercel env

## Free tier map

| Service | Used for |
|---------|----------|
| Vercel Hobby | Auth + credentials API |
| Neon Free | Postgres |
| Resend Free | Verification emails |
| Cloudflare R2 Free | Object storage |
| Tauri | Local desktop shell |
