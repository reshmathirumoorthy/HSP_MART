# HSP Mart

HSP Mart is made of three apps that share one Postgres database:

| App | Folder | Stack | Local URL |
| --- | --- | --- | --- |
| Storefront and portals | `src/` | Next.js | http://localhost:3000 |
| API | `backend/` | FastAPI (Python, uv) | http://localhost:8000 |
| Admin portal | `admin/` | Vite + React + TypeScript | http://localhost:5173 |

The storefront and the admin portal are clients of the API. All products and site content (menus, homepage, About, FAQs, company details, announcement bar) live in the database and are edited in the admin portal. Architecture details are in [docs/giftos.md](docs/giftos.md) and [backend/README.md](backend/README.md).

## Prerequisites

- Node.js 20 or newer, with npm
- Python 3.12 or newer, and [uv](https://docs.astral.sh/uv/)
- PostgreSQL 16 or newer, running locally

## First-time setup

```bash
# 1. Install dependencies
npm install
npm --prefix admin install
(cd backend && uv sync)

# 2. Configure the environment (the API reads this same file)
cp .env.example .env.local
#    Fill in at least:
#      SESSION_SECRET     → openssl rand -base64 32
#      REVALIDATE_SECRET  → any random string (lets admin edits show on the store immediately)

# 3. Create the database, apply migrations and load the catalogue
createdb hsp_giftos
npm run db:migrate
npm run db:seed
```

The seed only inserts missing rows, so you can re-run it safely. It never overwrites edits made in the admin portal.

## Product images

Catalogue photos are stored in the repository under `public/images/catalog/` as WebP files, at most 1600px on the longest side. The seed data links to them as `/images/catalog/<file>.webp`, and the storefront serves them through `next/image` (use the `CatalogImage` component). No external image host is used; Shopify is no longer part of the stack.

To add a product photo, put a WebP file in `public/images/catalog/` and reference that path in the product's images.

## Running all three

Open three terminals in the repository root:

```bash
npm run dev:api     # FastAPI   → http://localhost:8000
npm run dev         # Next.js   → http://localhost:3000
npm run dev:admin   # Admin     → http://localhost:5173
```

Start the API first, because the storefront loads all of its content from it.

### Signing in locally

Sign-in uses one-time codes. With `AUTH_DEV_OTP=1` (the default in `.env.example`), the code is shown on the login screen instead of being sent by email or SMS.

Development staff accounts created by the seed:

| Email | Role |
| --- | --- |
| admin@hspmart.test | Admin: everything, including Site content |
| procurement@hspmart.test | Procurement: products and fulfilment |
| finance@hspmart.test | Finance |

These accounts aren't created when `NODE_ENV=production`.

## Tests

```bash
createdb hsp_giftos_test          # once
npm run test:api                  # API tests (pytest, against hsp_giftos_test)
npm run test:e2e                  # Playwright: starts all three apps on ports 8100 / 3100 / 5174
npx tsc --noEmit && npm run lint  # type check and lint
```

## Production notes

- Set `ENVIRONMENT=production` on the API. This turns off simulated payment and messaging providers and the on-screen sign-in codes.
- Set the same `REVALIDATE_SECRET` on the API and on Next.js, and set `NEXT_REVALIDATE_URL` on the API to the storefront's `/revalidate` URL. Without them, admin edits still reach the store, but only within 5 minutes.
- Set `BACKEND_URL` on Next.js so it can reach the API.
- Point the admin portal's `/api` at the API, either through a proxy or with `CORS_ORIGINS` on the API.
- Run `npm run db:migrate` on every deploy.
- A database seeded before the move away from Shopify still has `https://cdn.shopify.com/...` image links in `products.content`. Re-running the seed won't fix them, because it never overwrites existing rows. Rewrite each link to `/images/catalog/<same file name>.webp` before the Shopify store is closed. Three names clashed across file types, and those keep the old extension in the new name, for example `12.png` → `12-png.webp`.
