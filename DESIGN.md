---
name: HSP Mart
description: A premium corporate gifting house. Emerald fields, champagne-ivory paper, antique-gold foil, Bodoni over Jost.
colors:
  emerald: "#0e3b2e"
  emerald-deep: "#082a20"
  emerald-hover: "#0a3025"
  emerald-mist: "#e7eee9"
  antique-gold: "#b98a3e"
  gold-bright: "#cfa65c"
  gold-bright-hover: "#dcb873"
  gold-ink: "#20180a"
  gold-soft: "#f5ead6"
  cream: "#fbf8f2"
  ivory: "#f3ede2"
  ivory-deep: "#ebe3d4"
  paper-white: "#ffffff"
  field-ink: "#f6f1e7"
  ink: "#1b231f"
  ink-secondary: "#46504a"
  ink-muted: "#6a716b"
  border: "#e4dccd"
  border-strong: "#d3c7b2"
  destructive: "#9b2c2c"
typography:
  display:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "clamp(3rem, 5.6vw, 5.25rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "clamp(2.2rem, 4vw, 3.4rem)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "1.45rem"
    fontWeight: 500
    lineHeight: 1.15
  title-card:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "1.08rem"
    fontWeight: 500
    lineHeight: 1.25
  price:
    fontFamily: "Bodoni Moda, Didot, Bodoni 72, Georgia, serif"
    fontSize: "1.35rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "\"lnum\" 1, \"tnum\" 1"
  body:
    fontFamily: "Jost, Futura, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 300
    lineHeight: 1.7
    letterSpacing: "0.005em"
  body-ui:
    fontFamily: "Jost, Futura, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Jost, Futura, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.14em"
rounded:
  sm: "4px"
  md: "8px"
  card: "10px"
  lg: "12px"
  card-lg: "14px"
  xl: "18px"
  pill: "999px"
spacing:
  shell-max: "82rem"
  section-y: "clamp(4rem, 8vw, 7rem)"
  grid-gap: "clamp(1rem, 1.6vw, 1.5rem)"
  card-pad: "1.1rem"
  head-gap: "clamp(2rem, 3.5vw, 3rem)"
  hero-frame-inset: "clamp(0.75rem, 1.6vw, 1.5rem)"
components:
  button-primary:
    backgroundColor: "{colors.gold-bright}"
    textColor: "{colors.gold-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.75rem"
    height: "3.25rem"
  button-primary-hover:
    backgroundColor: "{colors.gold-bright-hover}"
    textColor: "{colors.gold-ink}"
  button-outline-field:
    backgroundColor: "transparent"
    textColor: "{colors.paper-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.75rem"
    height: "3.25rem"
  button-outline-field-hover:
    textColor: "{colors.gold-bright}"
  button-emerald:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.field-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 1.75rem"
    height: "3.25rem"
  button-emerald-hover:
    backgroundColor: "{colors.emerald-deep}"
  button-quote:
    backgroundColor: "transparent"
    textColor: "{colors.emerald}"
    rounded: "{rounded.pill}"
    padding: "0 0.75rem"
    height: "2.6rem"
  button-quote-hover:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.field-ink}"
  button-quote-active:
    backgroundColor: "{colors.gold-soft}"
    textColor: "{colors.emerald-deep}"
  button-buy-round:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.gold-bright}"
    rounded: "{rounded.pill}"
    size: "2.6rem"
  card-product:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card-lg}"
    padding: "1.1rem"
  card-product-well:
    backgroundColor: "{colors.ivory}"
  quote-stamp:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.field-ink}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 0.7rem"
  caption-card:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1.1rem 1.2rem"
  header:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    height: "3.25rem"
  icon-button:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    size: "2.5rem"
  icon-button-hover:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.paper-white}"
  input-search:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.6rem 0.9rem"
    height: "2.5rem"
  quote-sheet-head:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.field-ink}"
    padding: "1.75rem 1.5rem 1.25rem"
  quote-sheet-panel:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    width: "30rem"
  assistant-mark:
    backgroundColor: "{colors.emerald}"
    textColor: "{colors.gold-bright}"
    rounded: "{rounded.pill}"
  announcement-bar:
    backgroundColor: "{colors.emerald-deep}"
    textColor: "{colors.field-ink}"
---

# Design System: HSP Mart

## Overview

**Creative North Star: "The Gifting House"**

HSP Mart presents every hamper as though it were being unboxed in a luxury gift boutique: rich deep emerald fields, warm champagne-ivory paper, and antique gold used as foil, never as paint. The register is the category standard for premium gifting (the user named Ferns N Petals and Neiman Marcus) executed straight and at craft level, rather than reinvented. Calm, assured and generous with space; the photography of real hampers carries the luxury, and the chrome stays quiet around it.

The system alternates two materials. Emerald fields (the hero, the quote sheet header, the closing band, the announcement bar) are where the house speaks in its own voice: white Bodoni with a gold italic accent word, gold pill actions, thin gold hairline frames. Paper surfaces (cream page, ivory bands, white cards) are where products are shown: Bodoni names and prices on white cards, ivory photo wells, emerald as the action colour and gold as rules and rings. Corners are soft, depth is warm and diffuse, motion is a slow exponential ease-out with no overshoot.

This world replaces a rejected "trade catalogue" direction (Archivo display, marigold accents, squared plates). Nothing from that world is part of this system; residual `--marigold` aliases in code now resolve to gold and exist only for back-compatibility.

**Key Characteristics:**
- Two materials only: emerald field and ivory paper; gold is a hairline, ring, icon or primary-action fill, never a surface.
- Bodoni Moda for every display line, product name, price and numeral; Jost for everything else.
- Italic Bodoni is the house's emphasis: one gold accent word in a headline, "On request" prices, order-trail numerals.
- Uppercase letterspaced Jost appears only on controls (buttons, text links acting as actions), never as a heading label.
- Pills for actions, soft 10 to 14px corners for cards, an arch for the hero photo window.
- Real product photography on warm ivory; no discount badges, banners or marketplace noise.

## Colors

A deep, restrained palette: emerald and ivory carry almost every surface, with antique gold as a metallic thread.

### Primary
- **House Emerald** (emerald): the brand field (hero, quote sheet header) and the paper-side action colour: prices, card buy button, "In your quote" stamp, emerald pill CTAs, active nav underline, `::selection`, `accent-color` and caret.
- **Deep Emerald** (emerald-deep): the deepest field (announcement bar, closing contact band) and the hover state of emerald actions. **Emerald Hover** (emerald-hover) is the legacy alias of the same step.

### Secondary
- **Antique Gold** (antique-gold): foil on paper. Hairline section rules (mixed at 45 to 55% into transparent), the ring around order-trail numerals, the focus ring (2px solid, 3px offset), the edge of an on-quote card, link-row arrows and the shadcn `ring`.
- **Bright Gold** (gold-bright): gold on emerald. The primary pill fill, the italic accent word in field headlines, the hero rule, icons on emerald (buy button glyph, close-band icons, assistant sparkle), and hero frame lines at 22 to 60% alpha. **Gold Ink** (gold-ink) is the only text colour on a gold fill; **Bright Gold Hover** (gold-bright-hover) is its hover.
- **Gold Soft** (gold-soft): the "already on the quote" state fill for quote buttons.

### Neutral
- **Cream** (cream): the page background and the quote sheet body; also the hero caption card.
- **Ivory** (ivory): alternate section bands (order trail, office supplies band) and every product photo well.
- **Ivory Deep** (ivory-deep): thumbnails and inset wells inside ivory or cream.
- **Paper White** (paper-white): product cards, header, icon buttons, inputs.
- **Field Ink** (field-ink): text on emerald; its 74% alpha form is the muted line on emerald.
- **Ink** (ink), **Ink Secondary** (ink-secondary), **Ink Muted** (ink-muted): text on paper, from headlines and names down to facts lines and compare-at prices.
- **Border** (border) and **Border Strong** (border-strong): hairlines on paper; strong for input and outline-pill strokes. **Emerald Mist** (emerald-mist) is the shadcn accent surface. **Destructive** (destructive) is reserved for shadcn error states.

### Named Rules
**The Foil Rule.** Gold is a thread, not a surface. It appears as 1px rules, rings, frames, icons, the focus ring and the single primary-action fill. No gold panels, gold section bands or gold gradients.

**The Two Golds Rule.** Antique gold (antique-gold) works on paper; bright gold (gold-bright) works on emerald. Do not swap them: antique gold muddies on emerald, bright gold washes out on ivory.

**The Gold Is Not Text On Paper Rule.** Antique gold against cream measures about 2.9:1, below AA for body and label sizes. On paper, gold may colour a rule, ring or icon; text stays ink or emerald.

## Typography

**Display Font:** Bodoni Moda (self-hosted variable woff2, 400 to 900, roman and italic, latin and latin-ext; fallback Didot, Bodoni 72, Georgia, serif)
**Body Font:** Jost (self-hosted variable woff2, 300 to 700; fallback Futura, system-ui, sans-serif)

**Character:** A high-contrast didone over a clean geometric sans: the voice of a luxury invitation set beside a tidy price list. Bodoni does the persuading, Jost does the explaining.

### Hierarchy
- **Display** (500, clamp(3rem, 5.6vw, 5.25rem), 0.98, -0.02em): the one hero headline per page on an emerald field, white with one italic 400 accent word in bright gold. Balanced wrapping.
- **Headline** (500, clamp(2.2rem, 4vw, 3.4rem), 1.02, -0.015em): section heads ("Signature hampers"); the closing band uses a slightly larger clamp(2.4rem, 4.6vw, 4rem).
- **Title** (500, 1.45rem, 1.15): step titles, occasion names (1.55rem on the hero row), quote sheet title (1.85rem), link-row items (1.3rem).
- **Title Card** (500, 1.08rem, 1.25, two-line clamp): product names on cards and the hero caption.
- **Price** (500, 1.35rem, line-height 1, lining tabular numerals): every fixed price, in emerald. "On request" uses Bodoni italic 400 at 1.05rem.
- **Body** (300, 1rem to 1.15rem, 1.7): lead paragraphs and section copy, held to about 30 to 34rem or 28ch for short step copy.
- **Body UI** (400, 0.78 to 0.9rem): facts lines ("Made to order · Can be personalised"), captions, nav and search text.
- **Label** (500, 0.74 to 0.82rem, 0.1 to 0.14em, uppercase): only on buttons and action links.

### Named Rules
**The Didone Numeral Rule.** Every price, count and step numeral is set in Bodoni Moda with lining tabular figures (`data-num`). Jost never carries a price.

**The One Italic Word Rule.** A field headline gets at most one italic accent phrase, in bright gold. Italic elsewhere is reserved for "On request" and ordinal numerals.

**The Labels Are Controls Rule.** Uppercase letterspaced Jost marks something you can press. It is never placed above a heading as a category label.

## Layout

Content sits in a centred shell (max 82rem) with side gutters stepping from 0.75rem on phones to 2.5rem on wide screens. Sections breathe on a vertical rhythm of clamp(4rem, 8vw, 7rem). Section heads are a three-column grid (headline, short copy, action link) above a gold hairline, collapsing to one column below 1024px.

Product grids run four columns on desktop, three below 1024px and two below 640px, with a gap of clamp(1rem, 1.6vw, 1.5rem) (0.75rem on phones). The hero is a two-column split (copy 1.05fr, arched window 0.95fr) that stacks below 960px, with the caption card dropping beneath the arch below 560px and both hero actions going full width. The four-occasion row under the hero runs four across, then two by two.

The order trail is a four-step row joined by a gold hairline; it becomes two columns at 1024px and a vertical timeline (the hairline running down through the numerals) at 640px.

The header is a single row on desktop (wordmark, primary nav from 1200px, search, icon actions); between 960 and 1199px the nav folds into the menu; on phones it becomes two rows: wordmark and icons above, full-width search below. Secondary header actions (notifications, compare) live in the menu at every width.

Breakpoints in use: 360, 420, 480, 560, 640, 768, 960, 1024, 1200px.

## Elevation & Depth

Depth is warm, diffuse and mostly tonal. Paper surfaces separate by tone (cream page, ivory band, white card). Cards carry a soft two-part shadow that lifts slightly on hover; the hero arch carries the deepest shadow to sit in front of the emerald field. Shadows are tinted with ink green, never neutral black.

### Shadow Vocabulary
- **Soft** (`0 1px 2px rgba(27, 35, 31, 0.05)`): the faintest separation for small panels inside paper surfaces (customization panels, checkout summary).
- **Card** (`0 1px 2px rgba(27, 35, 31, 0.04), 0 12px 28px -18px rgba(27, 35, 31, 0.28)`): product cards at rest.
- **Lift** (`0 2px 4px rgba(27, 35, 31, 0.04), 0 26px 50px -28px rgba(27, 35, 31, 0.4)`): card hover (with a 3px rise) and floating caption cards.
- **Deep** (`0 40px 80px -40px rgba(4, 20, 15, 0.6)`): the hero arch on emerald.

### Named Rules
**The Lift Not Pop Rule.** Hover raises a card 3px and swaps Card for Lift over 0.5s with the exponential ease-out (cubic-bezier(0.22, 1, 0.36, 1)). No scale bounce on cards; photos inside may drift to 1.03 over a second. Reduced motion removes both.

## Shapes

Soft and considered. Actions are pills (999px). Cards use 14px, shadcn primitives and the theme radius 10px, quote-sheet fields 8px, thumbnails 4px. The hero frame is an inset 1px gold line with an 18px radius, set in from the field edge by clamp(0.75rem, 1.6vw, 1.5rem). The hero photo window is an arch (full-round top, 12px bottom corners) with a 1px gold border and a second gold outline offset 10px. Round forms recur as the house's mark: gold-ringed numerals, the round buy button, round header icon buttons, the round assistant disc.

## Components

### Buttons
Calm, tactile pills in uppercase letterspaced Jost.
- **Shape:** full pill (999px); 3.25rem tall for page actions, 3rem for quote buttons, 2.6rem inside cards.
- **Primary (on emerald):** bright gold fill, gold ink text, 0 1.75rem padding; hover lightens to the gold hover step.
- **Outline (on emerald):** transparent with a 1px field-ink line at 45%, white text; hover turns line and text bright gold.
- **Emerald (on paper):** emerald fill, field-ink text, gold icon; hover deepens to deep emerald.
- **Focus:** the global 2px antique-gold outline at 3px offset, on every interactive element.
- **Text action link:** uppercase label in emerald on a 1px antique-gold underline with an arrow ("All gifts").

### Cards / Containers
The boutique product card, the system's main repeated unit.
- **Corner Style:** 14px, with the photo well taking the top corners.
- **Background:** white body; a 4:5 ivory photo well with `mix-blend-mode: multiply` so studio-white photography takes on the warm paper.
- **Shadow Strategy:** Card at rest, Lift plus 3px rise on hover (see Elevation).
- **Content:** Bodoni name (two lines), a quiet facts line in ink-muted, Bodoni emerald price or italic "On request", struck compare-at price in muted Jost, then actions: an outline pill "Add to quote" (border-strong stroke; hover fills emerald; active state gold-soft with antique-gold edge) beside a round emerald buy button with a gold glyph. Price-on-request items show only the quote pill.
- **On-quote state:** the card gains a 1px antique-gold ring and an emerald "In your quote" pill stamp with a gold check settles in at the photo's lower left (320ms fade-and-rise).
- **Only flag:** "Out of stock" as a white pill at the top left. No discount, sale or percentage badges.
- **Internal Padding:** 1.1rem (0.85rem below 420px).

### Inputs / Fields
- **Header search:** pill, 1px border-strong stroke on white, 2.5rem tall, Jost 0.88rem with a muted search glyph; focus-within shifts the stroke to emerald with a soft emerald halo.
- **Catalogue search and forms:** 1px border-strong stroke on white at the 52px touch minimum.

### Navigation
- **Header:** sticky white bar with a faint hairline. Logo plus "HSP Mart" wordmark in Bodoni 500 at 1.35rem (1.2rem on phones). Nav links in Jost 0.85rem; active link carries a 2px deep-emerald underline. Icon actions are 2.5rem round buttons with a hairline that fill emerald on hover; counts sit in small emerald pills and hide when empty. The quote request opens from a document icon button in the header; there is no floating quote tab.
- **Announcement bar:** deep emerald with field-ink uppercase letterspaced Jost.
- **Mobile:** two-row header, full-width search, slide-in menu that also hosts secondary actions and the shopping assistant.

### Quote Request Sheet (signature)
A right-hand shadcn sheet up to 30rem wide: an emerald header with a Bodoni 1.85rem title and muted field-ink description, a cream body listing gifts with 64 by 80px thumbnails, Bodoni line numbers, pill quantity steppers on 8px fields and an emerald pill submit. Overlays sit at z-index 320, above the storefront chrome.

### Hero Field (signature)
Emerald with a soft bright-gold radial glow at the upper right, the inset gold frame, the display headline, a 4.5rem bright-gold rule, a light Jost lead, gold and outline pills, and the arched photo window with a cream caption card (Bodoni name, price, quote pill). Beneath, a hairline-divided occasion row: Bodoni names with Jost notes and live product counts, gold arrow sliding in on hover.

### Order Trail
Four steps, each an italic Bodoni numeral in a 3.5rem gold-ringed circle on ivory, a Bodoni title and short light Jost copy, joined by a gold hairline.

### Assistant Mark
A round emerald disc with an inset bright-gold hairline and a gold sparkle glyph. The desktop launcher is a compact round white button with a gold-tinted edge; on phones the launcher is hidden and the assistant opens from the menu, so nothing floats over content.

### Implementation rule: catalogue images
Shopify-hosted photos (cdn.shopify.com) are resized by Shopify's CDN via a custom `next/image` loader (`?width=`) through `CatalogImage`; local images keep the built-in Next optimiser. New product imagery goes through `CatalogImage`, never a raw `img` or the default loader for Shopify URLs.

### Implementation rule: shadcn layer
Tailwind v4 theme and utilities load without preflight; shadcn primitives get a scoped mini-preflight keyed on `[data-slot]`, and their theme variables map onto this palette (primary emerald, ring and gold antique gold, radius 10px). New primitives inherit the world through those variables, not hardcoded colours.

## Do's and Don'ts

### Do:
- **Do** put the house's own voice on emerald and the products on paper; alternate cream, ivory and emerald bands down a page.
- **Do** set every name, price, count and numeral in Bodoni Moda with lining tabular figures.
- **Do** use bright gold for the primary action and accents on emerald, and antique gold for hairlines, rings and focus on paper.
- **Do** mark price-on-request items with Bodoni italic "On request" and route them to the quote pill.
- **Do** use the exponential ease-out (cubic-bezier(0.22, 1, 0.36, 1)) at 0.32s for state changes and 0.5s for card lifts, with reduced-motion fallbacks.
- **Do** read colour, radius and type from the `globals.css` world tokens and the shadcn theme variables.

### Don't:
- **Don't** add discount, sale or percentage badges, promotional banners or marketplace-style noise to cards.
- **Don't** fill surfaces with gold or use gold gradients; gold stays a thread (The Foil Rule).
- **Don't** set text in antique gold on cream or ivory.
- **Don't** put uppercase letterspaced labels above headings; uppercase Jost belongs to controls.
- **Don't** float persistent tabs or launchers over content on phones; quote and assistant live in the header and menu.
- **Don't** reintroduce the rejected trade-catalogue vocabulary: Archivo display, marigold fills, squared plates.
- **Don't** invent social proof (client logos, testimonials, ratings, order counts) to dress a section.
