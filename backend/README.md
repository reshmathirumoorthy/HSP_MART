# HSP GiftOS API (FastAPI)

All business rules and data access for HSP Mart. The Next.js store and portals (`../src`) and the React admin app
(`../admin`) are clients of this API. See `../docs/giftos.md` for the full picture.

```bash
uv sync
uv run uvicorn app.main:app --reload --port 8000 --timeout-keep-alive 75   # reads ../.env.local
DATABASE_URL=postgres://localhost:5432/hsp_giftos_test uv run pytest
```

| Area | Module |
| --- | --- |
| Sign-in (one-time codes), sessions shared with Next.js | `app/auth.py`, `app/services/otp.py`, `app/routers/auth.py` |
| Pricing engine, quotes, orders and fulfilment | `services/pricing.py`, `quotes.py`, `orders.py` |
| Razorpay payments, webhooks, refunds | `services/razorpay.py`, `payments.py`, `credit_notes.py` |
| Storefront checkout, enquiries, customer account | `services/online.py`, `enquiries.py`, `account.py`, `routers/store.py` |
| Partners, leads, contracts, commission ledger, payouts | `services/partners.py`, `ledger.py`, `payouts.py` |
| Suppliers, files and artwork, recipients, programmes, campaigns | `services/suppliers.py`, `files.py`, `storage.py`, `recipients.py`, `programmes.py`, `campaigns.py` |
| Storefront catalogue and site content (`/api/site-data`, admin editing, store refresh) | `services/catalogue.py` |
| Insights, AI engines, optional Claude wording | `services/insights.py`, `ai.py`, `llm.py` |
| Notifications outbox and providers, exports, Tally | `app/notify.py`, `services/exports.py`, `tally.py` |

Rules that hold everywhere: money is integer paise; every state change is audited in the same transaction; the
commission ledger is append-only; exceptions, credit notes and payouts need a second approver; webhooks are signed
and idempotent; files are type-checked by content and served only to staff, the order's customer or its supplier.

**Schema:** still defined by the Drizzle migrations in `../drizzle` (`npm run db:generate` / `db:migrate`).

**Not yet verified against live services:** Vercel Blob uploads through its REST API (`services/storage.py`; local
storage is used in dev and tests), and the Resend, WhatsApp and MSG91 senders (same requests as the previous
Node code, untested without accounts).
