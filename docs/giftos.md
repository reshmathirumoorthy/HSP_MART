# HSP GiftOS — platform runbook

The storefront (HSP Mart) plus the central-seller platform from *Reimagine HSP* (Blueprint v1.0).

## Architecture

| Part | Folder | What it does |
| --- | --- | --- |
| **API** (FastAPI, Python) | `backend/` | Owns every business rule and all data: pricing, quotes, orders, payments and webhooks, credit notes, partners and commission, payouts, files, notifications, AI engines, exports, enquiries, customer account. Every request is authorised here. |
| **Storefront and portals** (Next.js) | `src/` | Renders the store, `/account`, `/my`, `/partner`, `/supplier`, `/join`, `/login` and the legacy `/admin`. Pages and server actions call the API through `src/lib/api.ts`; the browser calls `/api/*`, which Next.js forwards to the API. Next.js has no database access. |
| **Admin portal** (React + Vite) | `admin/` | The HSP staff console: enquiries, quotes and the AI assistant, orders end to end (artwork, POs, dispatch, POD, credit notes, recipients), suppliers, partners and contracts, payouts and exports, insights and campaigns, programmes. |
| **Catalogue & content** | `products`, `site_content` tables | Every storefront page renders products, categories, company details, FAQs, menus, footer, announcement bar, homepage and About copy from `/api/site-data`. Staff edit them in the admin app (Products, Site content); saves refresh the store immediately via `POST /revalidate` (secret `REVALIDATE_SECRET`), and otherwise within 5 minutes. Delivery promises are generated from the backend's checkout rule. `scripts/db/seed-data/` is only the one-time import of the original catalogue. |
| **Database** | PostgreSQL | One database. The schema and migrations are still defined with Drizzle (`src/db/schema.ts`, `drizzle/`). |

Sign-in uses one-time codes. The API issues the `hsp_session` cookie, so one sign-in covers the store, the portals and the
admin app (same site).

| Portal | Where | Roles |
| --- | --- | --- |
| Customer | `/account` (orders, bulk requests, profile, addresses, wishlist, inbox), `/my/quotes/[n]`, `/my/orders/[n]`, `/join` | `customer` |
| Partner | `/partner` (earnings, leads, quotes, AI sales coach) | `associate`, `franchise`, `enterprise_partner` |
| Supplier | `/supplier` | `supplier` |
| HSP staff | admin app (`admin/`), also `/admin` in Next.js | `hsp_admin`, `hsp_finance`, `hsp_procurement` |

## Run locally

```bash
postgres -D /opt/homebrew/var/postgresql@18     # if not already running
createdb hsp_giftos && createdb hsp_giftos_test
cp .env.example .env.local                      # fill SESSION_SECRET (openssl rand -base64 32)
npm run db:migrate && npm run db:seed
npm run dev:api                                 # FastAPI on :8000 (reads .env.local)
npm run dev                                     # store + portals on :3000 → /login as admin@hspmart.test (dev code on screen)
npm run dev:admin                               # admin app on :5173
npm run test:api                                # pytest against hsp_giftos_test (run test:e2e once first to seed it)
npm run test:e2e                                # Playwright: starts API, admin app and Next.js; resets hsp_giftos_test
```

End-to-end specs: `e2e/phase1-foundation` … `e2e/phase12-app-integrity` (Playwright starts the API, the admin app and
the storefront itself and resets `hsp_giftos_test`). API tests: `backend/tests/`.

| Command | What it does |
| --- | --- |
| `npm run test:e2e` | All E2E specs, headless Chromium, storefront on `next dev` |
| `npm run test:e2e:prod` | Same, storefront from a production build (faster, closer to production; used in CI) |
| `npm run test:e2e:headed` | Watch the browser (add `-- e2e/phase8-backend.spec.ts` to pick a spec) |
| `npm run test:e2e:ui` | Playwright UI mode: pick, re-run and time-travel through tests |
| `npm run test:e2e:all-browsers` | Chromium, Firefox and WebKit (`npx playwright install` first) |
| `npm run test:e2e:report` | Open the last HTML report (`playwright-report/`) |
| `npm run test:all` | API tests, then E2E |

Failures keep a trace, screenshot and video in `test-results/`. Shared staff sessions are cached in
`test-results/.auth` (cleared each run) because sign-in codes are limited to 5 per account per 15 minutes.
CI: `.github/workflows/tests.yml` runs the production-build E2E suite and the API tests on every push and PR.

## Deploying anywhere with Docker

`docker-compose.yml` runs the whole platform on one host: Postgres 17 with pgvector, the API, the storefront, the
admin console, an nginx gateway and the scheduled jobs.

```bash
cp deploy/.env.docker.example deploy/.env.docker   # fill SESSION_SECRET, CRON_SECRET, REVALIDATE_SECRET, provider keys
docker compose up -d --build
docker compose run --rm migrate                    # apply the schema (safe to re-run on every release)
docker compose run --rm seed                       # first install only: catalogue, content, staff users
```

Store: `http://<host>` · Admin: `http://admin.<host>` (the gateway routes by hostname; `/api` goes to the API on both).
For production, point DNS for both names at the host, put TLS in front (or add certificates to `deploy/nginx.conf`),
keep `ENVIRONMENT=production` (secure cookies) and leave `AUTH_DEV_OTP` empty. Uploads persist in the `uploads`
volume and the database in `dbdata`; back both up. The `cron` service calls the four jobs every
`CRON_INTERVAL_SECONDS` (default hourly). Verified locally: images build, migrate + seed succeed, store, admin, sign-in,
plan and all four cron jobs work through the gateway.

## Deploying on Vercel (previous setup)

- **API:** deploy `backend/` as its own service (for example a Vercel project with the FastAPI preset, or any container
  host). Give it the same `DATABASE_URL` and `SESSION_SECRET` as before, plus the provider keys in `.env.example`.
  Run uvicorn with `--timeout-keep-alive 75` (or longer than the proxy's keep-alive).
- **Next.js:** set `BACKEND_URL` to the API's internal URL. Cron entries in `vercel.json` hit `/api/cron/*`, which
  Next.js forwards to the API (protected by `CRON_SECRET`).
- **Admin app:** `npm --prefix admin run build` and serve `admin/dist` on the same site as the API (for example
  `admin.hspmart.com` with `/api` routed to the API) so the session cookie is first-party.

## Business rules enforced in code

- **Money** is integer paise. GST on goods and freight; commission base excludes GST and freight.
- **Pricing engine** (`backend/app/services/pricing.py`) is deterministic. Contribution below 12% → quote needs an
  exception approved by a *different* admin/finance user with a written reason.
- **Attribution**: one partner per order. Leads are protected for 90 days by email/domain; national key accounts
  cannot be registered. A direct HSP quote to a protected customer is still attributed to the partner.
- **Payments**: Razorpay webhooks are signature-verified and idempotent per event; amount mismatches are ignored and
  audited. 50% advance before production, full payment before dispatch, exact reconciliation to close.
- **Commission ledger** is append-only: pending → earned (paid, delivered, reconciled) → approved (after
  `RETURN_WINDOW_DAYS`, KYC verified) → paid (payout). Cancellation reverses.
- **Payouts**: maker-checker, TDS at `COMMISSION_TDS_BPS` (confirm under Income-tax Act 2025 s.393), idempotency key,
  each paid row linked to its payout.
- **Deposits** are recorded as a liability, never revenue. No earnings for recruiting.
- **AI engines** (`backend/app/services/ai.py`) are read-only: suggest and draft, never change prices, commissions,
  suppliers, refunds or payouts; only active products and approved suppliers.
- **Notifications** go through an outbox; marketing is blocked without consent; OTP codes are redacted.
- **Audit**: every state change writes `audit_events`.

## Added in phase 7

- **Storefront checkout** (`backend/app/services/online.py`): cart → real order, re-priced from the DB (prices excl. GST,
  ₹99 delivery below ₹999, GST on top), sign-in required, paid in full via Razorpay, idempotent per checkout attempt.
- **Credit notes & partial refunds** (`backend/app/services/credit_notes.py`): returned quantities or value adjustments,
  maker-checker, refund through Razorpay linked by `notes.credit_note`; amount due = total − credited; commission base
  shrinks by credited taxable value (clawback flagged in audit if already paid).
- **Renewal commission** (`account_contracts`): after a converted lead, admin/finance records a contract (term,
  renewal % ≤ 10%); attribution order is protected lead → active contract → direct. Ending a contract needs a reason.
- **Files** (`backend/app/services/storage.py` and `files.py`, `/api/files/{id}`): artwork and delivery proofs in private Vercel Blob (local
  `.uploads/` in dev), content-sniffed, authorised download. Branded orders need approved artwork before production.
- **Accounting**: Tally Prime XML vouchers (`/api/admin/exports/tally`) + credit-notes CSV.
- **Notifications**: Resend (email), WhatsApp Cloud API, MSG91 (SMS) adapters; retry cron `/api/cron/notifications`.
- **AI wording** (`backend/app/services/llm.py`): optional Claude rewording of coach messages; numbers must survive or the
  deterministic draft is kept.

## Added in phase 10

- **Customer complaints** (`backend/app/services/grievances.py`): customers raise them on `/my/orders/[n]`, the
  selling partner on `/partner/complaints` (own attributed orders only). Staff route supply defects to a supplier that
  has a PO on the order (admin app → Complaints); the supplier answers on `/supplier` without seeing customer details;
  staff record the resolution, optionally linked to a credit note, then close. Target: 3 days (`due_at`), overdue
  count shown in Insights. Customer is emailed/WhatsApped on receipt and resolution.
- **Franchise deposit settlement** (`backend/app/services/deposits.py`): only for a suspended franchise; finance
  raises a settlement with documented deductions (≤ deposit); a *different* finance user approves with the bank
  transfer reference. Approval zeroes the deposit liability and terminates the franchise. No new deposit can be
  recorded while a settlement is pending.
- **Customer advances**: Insights shows money received on undelivered orders as a liability (unearned revenue).
- **P2 analytics** (Insights): demand forecast by division for the next 3 months (trailing 3-month average, last
  year's volume as a floor in festive months; replace with a fitted model once a year of orders exists), franchise
  analytics (leads, quotes, orders, revenue, contribution, complaints, deposit) and a supplier scorecard
  (POs, delivered, average days to deliver, complaints).

## Added in phase 11 (previously deferred)

- **Courier booking & tracking** (`backend/app/services/courier.py`): order page → *Book courier & dispatch* books
  with Shiprocket (`SHIPROCKET_EMAIL`/`PASSWORD`, pickup location name as set up in Shiprocket) and dispatches with the
  AWB; cron `/api/cron/tracking` (daily on the Vercel Hobby plan; set every 2 h on Pro) polls status and marks the order delivered when every courier shipment is
  delivered, with the courier confirmation as proof. Without credentials a simulated courier runs the same flow.
  Manual dispatch still works. Parcel weight is estimated at 0.5 kg per unit until SKU weights are captured.
  The Shiprocket calls follow its public API but have not been exercised against a live account yet.
- **Product search for the AI engines** (`backend/app/services/search.py`): Postgres full-text + trigram (typo
  tolerant) always; with `VOYAGE_API_KEY`, pgvector embeddings are blended in (cron `/api/cron/embeddings` nightly,
  or admin `POST /api/admin/search/reindex`). Editing a product clears its embedding so it is re-embedded.
- **Refunds in Tally**: each processed refund exports a Payment voucher (customer → `Razorpay Clearing`).
- **Installable app**: `src/app/manifest.ts` + icons; phones can add HSP Mart to the home screen, with shortcuts to
  the partner and supplier portals. Native store apps are not built.
- **Redis**: still not used — Postgres outbox + cron handle current volume; add a queue only when cron latency or
  load requires it.

## Added in phase 12 (launch readiness)

- **Financial plan** (admin → *Plan & readiness*, `backend/app/services/plan.py`): the blueprint's §4 model with every
  driver editable by finance (audited). Defaults reproduce the PDF exactly (revenue 297.30 / 1,692 / 6,480 lakh, cash
  −70.31 / 22.87 / 456.39, Year 1 break-even ₹4.82 Cr, associate commission ₹1,875 / 3,000 / 4,200 a month). Working
  capital is an input per year because the PDF gives figures but not its method. Shown beside platform actuals for the
  last 12 months and HSP's imported history.
- **Scale readiness** (`readiness.py`): the seven §10 conditions measured live — reconciliation, commission integrity,
  12% contribution share, supplier on-time, defect rate, associates with repeat customers, complaint SLA. Targets are
  management defaults in `TARGETS`.
- **Data imports** (admin → *Data imports*, `imports.py`): CSV templates and importers for dataset 1 (landed costs and
  prices), 2 (12 months of sales → `sales_history`), 3 (suppliers, rates, lead times, stock; new suppliers start
  *pending*), and the CA's signed `gst-review.csv` (only rows with a decision and initials are applied, each audited).
  Every file is validated in full first; nothing is written unless all rows are valid.

## Added after the codebase audit

- **Staff & roles** (admin app, admins only; `backend/app/services/users.py`): add staff by email (an existing customer
  account is promoted), change between Admin / Finance / Procurement, deactivate and reactivate, with search and paging.
  Partner and supplier access is still granted from their own pages. Every change is audited and ends that person's
  sessions; you cannot change your own account, and at least one active admin always remains.
- **Security headers**: the store (`next.config.ts`), the API (`backend/app/main.py`) and the admin app
  (`admin/nginx.conf`) send `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a CSP limited to
  `frame-ancestors`/`base-uri`/`object-src` (a full script policy with nonces is a follow-up); private API responses are
  `Cache-Control: no-store`.
- **API logging**: one line per request (method, path, status, duration, request id; no query strings) and a full
  traceback for unexpected errors, which return a generic message with a `requestId` customers can quote.
  `X-Request-Id` is accepted from a proxy or generated.
- **Dependencies**: Next.js 16.4.6 (fixes a critical advisory); unused `@vercel/blob`, `@anthropic-ai/sdk` and
  `class-variance-authority` removed. `npm audit --omit=dev` reports 0 vulnerabilities.
- **Fixes**: `sitemap.xml` now lists the live catalogue (it listed no products); JSON-LD output escapes `<`.

## Scheduled jobs

The Vercel project is on the Hobby plan, which allows each cron at most once a day, so `vercel.json` runs all four
daily. Notifications are sent immediately when created; the cron only retries failures. On Pro, use
`*/15 * * * *` for `/api/cron/notifications` and `0 */2 * * *` for `/api/cron/tracking`.

## Decisions taken (2026-11-19, changeable)

| Decision | Setting | Where |
| --- | --- | --- |
| Advances are a liability until dispatch | Tally: Sales voucher dated at first dispatch; receipts before it credit `Customer Advances`, then a Journal moves them to the customer | `services/tally.py`, `TALLY_ADVANCE_LEDGER`, `TALLY_BANK_LEDGER` |
| TDS on commission | 2% (old s.194H rate) pending CA confirmation under Income-tax Act 2025 s.393 | `COMMISSION_TDS_BPS=200` |
| Delivery charge | ₹99 + GST below ₹999 | `services/online.py` |
| Renewal commission | Default 5%, maximum 10% | admin contracts form / API default |
| Online orders need sign-in | Yes (protects attribution and order history) | storefront checkout |
| Return window before commission approval | 7 days | `RETURN_WINDOW_DAYS` |
| GST classification | HSN assigned only where unambiguous (45 products); no rate changed. Every product listed with proposed HSN/rate and confidence in `docs/compliance/gst-review.csv` for the CA. Re-run: `cd backend && uv run python -I ../scripts/db/gst-review.py $DATABASE_URL` | admin app → Products to apply CA decisions |
| Legal documents | Drafts in `docs/legal/` (associate, franchise, deposit policy, supplier, customer terms, privacy/consent) with questions for the advocate | `docs/legal/README.md` |

## Before go-live (not done in code)

- Razorpay live keys + webhook secret (subscribe to `payment.captured`, `payment.failed`, `refund.processed`);
  RazorpayX fund-account onboarding for live payouts.
- Provider accounts: `EMAIL_PROVIDER_KEY`/`EMAIL_FROM`, WhatsApp templates approved by Meta (named like `quote_sent`),
  MSG91 DLT templates (`SMS_TEMPLATE_AUTH_OTP`, …). `BLOB_READ_WRITE_TOKEN`. `CRON_SECRET`. `HSP_GST_STATE`.
- Real landed costs per SKU / supplier rates (engine estimates 70% cost until then); confirm GST rates per HSN.
- Business decisions to confirm: delivery fee/threshold, default renewal %, whether online orders need sign-in.
- Legal review: partner agreement, franchise/direct-selling rules, FSSAI for food hampers, DPDP consent.
- Accountant to confirm the advances treatment, create the `Customer Advances` and `Razorpay Clearing` ledgers in Tally,
  and decide how outgoing refunds are posted (refunds currently appear only via Credit Note vouchers).
- CA to complete `docs/compliance/gst-review.csv`; advocate to review `docs/legal/`.
- Shiprocket account + pickup address; `VOYAGE_API_KEY` for semantic search; a higher-resolution logo for app icons.
- Not built (deliberately): Redis/background workers (Postgres outbox + cron cover current volume) and native
  app-store apps (the installable web app covers phones).
