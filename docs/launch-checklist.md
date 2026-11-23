# HSP GiftOS launch checklist

The software from the Reimagine HSP blueprint is built, tested and merged. What's left is the decisions, keys, reviews and data that only the team and our advisers can provide. Each item lists what is needed and how we'll know it's done.

**Code status:** all blueprint and audit work is on `main`. The tests (API, admin app and full browser suite) pass in CI.

## 1. Leadership and engineering (decide first, since other items depend on it)

### Choose hosting
Pick where the store, the API and the admin app will run. The current Vercel setup is for development only. All three are already packaged as Docker images.

- **Done when:** we have a host, the domains `hspmart.com` and an admin subdomain point at it, and `ADMIN_APP_URL` and `SESSION_COOKIE_DOMAIN=.hspmart.com` are set. This lets staff sign in once for both the store and the admin app.
- **Blocks:** go-live

### Get live provider accounts and keys
Razorpay (payments), the courier partner, email and SMS (sign-in codes and notices), and the AI provider used by the quotation assistant and search.

- **Done when:** the production keys are stored in the host's secret settings. Keys must never be sent by email or chat, or committed to the code.
- **Blocks:** payments, delivery, sign-in

### Run a test payment end to end
Using Razorpay test keys, place an order and pay through Checkout. The site now has a strict security policy. Automated tests confirm that no page breaks it, but they don't complete a real Razorpay payment.

- **Done when:** a test payment succeeds and the order shows as paid in the admin app.
- **Blocks:** payments

## 2. Chartered accountant (review and confirm)

### Check the GST review sheet
Confirm the HSN codes and GST rates used for each product category.

- **Done when:** the CA signs off on the sheet or returns corrections.

### Confirm the TDS rate on partner payouts
The system deducts TDS before paying partners. The rate it uses needs confirming.

- **Done when:** the confirmed rate is set in the system.

### Confirm the Tally ledger names
The Tally export uses ledger names for sales, GST, partner payouts and customer advances. They must match HSP's Tally setup exactly.

- **Done when:** a sample export imports into Tally cleanly.

## 3. Legal (review drafts)

### Review the legal drafts
The customer terms, privacy notice, associate agreement, franchise agreement, supplier agreement and deposit refund policy are drafts in [`docs/legal/`](legal/). They were written as a starting point, not legal advice.

- **Done when:** counsel approves the text and it is published on the site.
- **Blocks:** go-live

## 4. HSP business team (supply data and run the pilot)

### Supply the real data
Products, suppliers and partners as CSV files. Staff can load them in the admin app under **Data imports**, which checks each file before saving anything.

- **Done when:** the live catalogue, supplier list and partner network are loaded and spot-checked.

### Run the pilot
Start with a small group of partners and customers, take real orders, and collect feedback before the full launch.

- **Done when:** the pilot's orders, payouts and deliveries have run end to end, and the issues found are logged.

---

Engineering can do the hosting setup and deployment as soon as the hosting choice and keys are in place. The operating steps are in [`docs/giftos.md`](giftos.md).
