# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: corporate buyers.** HR, admin, procurement and founders' offices at Indian companies who order gifts in bulk: festive gifting (Diwali first), employee welcome kits, rewards and recognition, and client gifting. They work to a deadline and a per-unit budget. They need to know quickly what's available, what branding is possible, and how to get a quote. Often they shortlist on the site and close on a call or WhatsApp.

**Secondary: individuals.** People buying single hampers and gifts for weddings (shagun, platters, trousseau), festivals and personal occasions. They pay at checkout or enquire about made-to-order hampers.

## Product Purpose

HSP Mart is the online storefront of HSP Office Basics Private Limited. It sells curated gifts and hampers, presentation boards and office essentials, at retail and in bulk. Success means a corporate buyer can go from "we need 200 Diwali gifts" to a credible shortlist and a quote request in minutes, and an individual can buy or enquire about a hamper without friction.

## Positioning

- **Curated, packed in-house.** HSP designs, assembles and packs its hampers itself rather than reselling boxed product.
- **Branding and customisation.** Logos, names and custom packaging on gifts and platters.
- **One vendor for gifting and office supplies.** The same company supplies corporate gifts and office or presentation supplies (whiteboards, notice boards, easels, desk accessories), so a business can consolidate vendors.

## Operating Context

- The catalogue was imported from the production Shopify store (hspmart.com), with roughly 281 products. Gifting is split by occasion: Corporate, Festive, Wedding and Occasional. Other categories are Boards & Presentation, Personalised/Custom, Desk and Stationery.
- About 70 premium hampers are "price on request" and sold by enquiry and quote. The rest have fixed INR prices, many with a compare-at price.
- The bulk-quote flow (`/bulk-quote`) is the main conversion for corporate buyers. Phone (+91 99996 98694) and email (info@hspmart.com) are primary contact channels.
- Locations: registered office at 1112A, 11th Floor, Ansal Bhawan, 16 KG Marg, New Delhi 110001; retail store at B-12, Shubham Enclave, Paschim Vihar, New Delhi 110063. Production lists Delhi, Gurugram and Noida as areas served.
- Free delivery on orders above ₹499 (production announcement bar).

## Capabilities and Constraints

- Next.js 16 (App Router) frontend. Styling is CSS Modules plus `globals.css` tokens, with Tailwind v4 utilities and shadcn/ui (Radix) adopted incrementally; Tailwind preflight is intentionally off.
- **Frontend-only for now (user decision).** Cart, checkout, orders, quotes, wishlist and account are stored in the browser (localStorage). No payment is taken, and quotes and orders do not reach the business yet. The backend (headless Shopify, ERPNext or custom) is undecided.
- Existing features: catalogue with filters and search, product pages, a customization studio for curated products, hamper builder, bulk quote, compare, wishlist, recently viewed, account area, an AI shopping assistant, and FAQ, About and Contact pages.
- Missing versus production: policy pages (shipping, returns, cancellation, privacy, terms), Our Clients, Careers and Track Order.

## Brand Commitments

- Name: **HSP Mart** (legal: HSP Office Basics Private Limited). Existing logo at `public/images/hsp-mart-logo.png`.
- Brand palette: deep green with ivory and gold accents.
- **Visual register (user-confirmed, 2026-11-09):** a premium gifting house, comparable to Ferns N Petals and Neiman Marcus. That means rich deep colour, elegant serif display, gift-box presentation and festive warmth, like a luxury gift boutique. The user rejected a "trade catalogue" direction as not modern or premium enough.

## Evidence on Hand

- Real product photography for imported products on the Shopify CDN, many with an HSP Mart branded backdrop.
- Real prices, compare-at prices, stock status and descriptions from production.
- **No client logos, testimonials, case studies, order volumes or ratings are available (user-confirmed).** Do not fabricate social proof, counts of clients, years in business or delivery guarantees beyond those stated above.

## Product Principles

1. **Corporate buyer first.** Every key page should make the bulk and branded path obvious: quote, MOQ, customisation and contact.
2. **Show the craft, don't claim it.** Let real hamper photography and the curation and packing process carry the premium feel instead of superlatives or invented proof.
3. **Honest commerce.** Mark price-on-request clearly. Never imply payment, delivery or quote handling the system doesn't actually perform.
4. **One trusted vendor.** Gifting and office supplies should feel like one coherent house, not two stores.

## Accessibility & Inclusion

Target WCAG 2.1 AA. There's a significant mobile audience (individual buyers, and corporate buyers following up from their phones), so touch targets, legible type and reduced-motion support matter.
