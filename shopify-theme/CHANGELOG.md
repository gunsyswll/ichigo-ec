# Ichigo Theme — Changelog

Versioning for the **Ichigo-preview** theme (Shopify theme id 186906968344).
The live **Rise** theme is never touched. Bump with `python3 ../bump_version.py [major|minor|patch]`.

## v1.5.1 — 2026-08-05
Follow-up to v1.5.0 item 1: the root type lift is rem-based, so it never reached text inside the
SVG maps. Their declared size is in user units — actual size on screen is
`declared x (rendered width / viewBox width)` — so the numbers in the file were misleading.
- **Delivery Area map (`.phmap`, viewBox 1024).** Renders at a fixed 300px at *every* viewport
  (scale 0.293), so "Metro Manila" at 36px was painting at **10.5px** and "+ nearby provinces" at
  25px was painting at **7.3px** — the smallest text on the site. The two inline sizes move out of
  the markup into `.phmap .geo-lbl` (51px / 43px) → **14.9px / 12.6px** on screen at all widths.
- **Journey map (`.geomap`, viewBox 500).** Scales with its column: 2.0x at ≥1024 (13px → 26px,
  already fine) but 0.70x at 390 (13px → **9px**). Two mobile steps only where it falls short:
  16/14px under 600, 17/15px under 430 → **11.8px / 10.4px** at 390. 19/17px was tried first and
  clipped "Warehouse" off the left edge and "Airport" off the right, so 17/15 is the measured
  ceiling — the journey map cannot carry larger labels at 390px without a layout redesign.
- **`.geo-cap` had no CSS rule at all** and inherited `.shipmap`'s cream onto the ivory map panel —
  cream on cream, invisible. Now styled. Overlaid it collides with the "Airport" label below 480px,
  so under 600px it reflows to a line above the map instead of a layer on top of it.
QA: both maps screenshotted at 1280 and 390 (no clipping, no label collisions); the 7-page ×
4-viewport layout scan is unchanged from v1.5.0; per-page type/colour re-checked — root 17.6px,
min HTML text 11.6px, zero elements on the old grey.

## v1.5.0 — 2026-08-01
Client feedback round 3 (3 items, relayed by LAU).
- **Item 1 — "text size is a little bit too small."** The type scale is entirely rem-based, so
  the root moves 16px → 17.6px (`html{font-size:110%}`) and every size scales +10% with its
  proportions intact. Measured effect on the pages that carry the most small text: 10.6px → 11.6,
  11.5px → 12.7, 12.5px → 13.8. px-based chrome (header height, gutters, card padding) is
  deliberately unaffected, so nothing reflows — verified across 7 pages × 4 viewports
  (1440/1280/768/390): no new horizontal scroll, no clipped text, no console errors, results
  identical to the pre-change build. Four labels that would still have sat under the 11px legible
  floor were raised individually (`.card-tag`, `.icon-btn .dot`, `.tl-when`).
- **Item 2 — "don't like the grey colour used in the description / remark text."** That grey is
  the `--greige-deep` token, and 81 of its 82 uses are text colour, so the token itself moves:
  `#6E6256` → `#4A403A`. Warmer and darker — reads as soft ink rather than grey — and contrast on
  cream goes 5.5:1 → 9.4:1. Three alternatives were rendered for the owner to choose from
  (#574B41 / #4A403A / #3D342E); swap the token value if a different one is picked.
- **Item 3 — "remove the Home / Shop breadcrumbs."** The 11 visible `.crumb` rows are removed
  (product, product-gift, collection, cart, wishlist, blog, article, about, farmers, help, shop),
  along with the now-dead `.crumb` CSS and two wrapper divs left empty by the removal.
  **SEO note:** those rows carried *no* structured data, so Google could not read them as a
  breadcrumb trail — their only value was the internal link to Home. `snippets/breadcrumb-schema.liquid`
  now emits a proper schema.org BreadcrumbList (rendered from `layout/theme.liquid`), which is what
  Google actually consumes to show a breadcrumb path in search results. Depth is per template:
  product/article get Home > parent > leaf, collection/blog/page get Home > leaf, index emits
  nothing. JSON validity and depth verified for all five template cases.

## v1.4.0 — 2026-07-31
Client feedback round 2 (9 items, `~/Downloads/ichigo-site_feedback.pdf`; client-facing answers
in `docs/site-feedback-answers-2026-07-31-ja.md`). Note: several of the client's screenshots
show the pre-v1.3.0 build — the live theme was already past some of the complaints.
- **Item 1 — sticky sub-navs flush under the header.** The About jump-tabs and product pd-tabs
  offsets are now driven by a `--header-h` CSS variable measured from the real header box in
  `theme.js` (updated on scroll/resize/load), replacing the hardcoded 71/72/63/64px that could
  drift from the actual header height. The product tab bar loses its floating-island styling
  (`max-width:1200px;margin:18px auto 0` → full-bleed, centered pills) so it welds to the header
  when stuck.
- **Item 2 — copy removed**: Help hero subtitle, Farmers hero subtitle, and the "close enough to
  the airport…" clause of the Farmers map caption (sentence now ends "…east of Tokyo.").
- **Item 4 — no placeholder contact channels.** The hardcoded Live Chat card is gated behind a
  new `live_chat_hours` setting; the "Still need help?" sidebar box and the "Still have
  questions?" band hide entirely when no channel is configured.
- **Items 6/7 — nav IA.** Header fallback: Shop / Reserve → `/pages/shop` (the designed grid
  page), Ichigo Club → `/products/japanese-strawberry-club`.
- **Item 6 — Club page order.** New `overview_first` setting on the product section renders the
  "About This Box" block above the gallery/buy box and suppresses the duplicate truncated
  description; new `templates/product.club.json` (cloned from the live editor-managed
  product.json incl. app sections, so the Wishlist Plus block survives) enables it, assigned to
  the Club product via `template_suffix`.
- **Item 8 — Follow band placements.** Same index-follow band added under Home's News & Events
  (`follow_news` instance, no "coming soon" note) and above the Shop page footer; the section's
  hardcoded `id="follow"` became `follow-{{ section.id }}` so multiple instances stay valid.
- **Item 5 (store-side, not in-repo).** The Shopify Subscriptions app embed was appending an
  unstyled purchase-options widget after the footer on the Club page; disabled in
  settings_data (surgical PUT — theme's native selling-plan selector already covers it).

## v1.3.0 — 2026-07-19
Follow-up to the 2026-07-19 site audit (69 agents, 55 verified-open findings). This release covers
only what needed no client data or owner decision; the rest is queued in the vault at
`Brain/Pending/ichigo-ec.md`.
- **Unverified credential claims removed** (owner decision, 2026-07-19) — the About page's
  `Licensed — Registered importer of record` and `FDA Compliant — Meets local food-safety standards`
  cards are gone from `page-about.liquid` and all three static copies (`about.html`,
  `src/about.body.html`, `beta/about.html`). Neither was substantiated, and both sat above four
  empty certification-logo slots. `.cred-grid` gains a `cred-2` modifier so the remaining two cards
  (Cold Chain, Customs Cleared) fill the row correctly at every breakpoint.
  *Still standing, not covered by this decision: the About counters (Founded 2023 / 2 Partner Farms
  / 1200+ Boxes Delivered / 800+ Happy Customers) and the product page's `4.8 / 5 · 124 reviews`,
  on a store with zero real orders.*
- **SEO** — meta description (page_description → product → article → new setting fallback),
  `<link rel="canonical">`, Open Graph + Twitter card tags, JSON-LD `Product` on product templates,
  and a favicon link. New **SEO & Social** settings group (`meta_description`,
  `social_share_image`, `favicon`), all empty by default so nothing placeholder ships.
- **Accessibility** — skip-to-content link (reusing the locale string that already existed);
  exactly one `<h1>` per page (hero's two h1s merged; the farm-panel titles that alternated as a
  second live h1 via the tab switcher demoted; an h2→h4 skip on Help fixed); accessible names on
  the CSS-background product gallery, with `role="img"` on an empty child rather than the container
  — on the container it makes the subtree presentational and hides the Sale/Gift badge.
- **Dead links and placeholder values** — Privacy/Terms/Cookie/Legal Notice links now hide when
  unset instead of rendering `href="#"` (only the Privacy Policy is actually set in Admin, so three
  were dead); `support@example.ph` and Messenger `@example.ph` became empty-default settings that
  hide their contact card; Instagram/Facebook icons likewise hide until real handles are supplied.
- **Content correctness** — `product.html` placed the farm in Yame, Fukuoka while the rest of the
  site says Chiba, and asserted "only farms registered with JA Fukuoka can grow and sell" Amaou;
  Amaou is a Fukuoka JA trademark and cannot apply to a Chiba farm. Genericized following v1.0.5's
  approach and the legal claim dropped.
- **Orphan cleanup** — deleted `index-why.liquid`, `index-newsletter.liquid` and
  `page-product.liquid`. The last one is the reason: unwired but schema-registered, so the theme
  editor's "Add section" picker still offered the pre-v1.0.5 fabricated farm copy (Tanaka / Yame /
  Brix / 2.5 hectares) that v1.0.5 stripped from its five siblings.
- **Collection page** — native sort dropdown (`collection.sort_options`, GET form, works without JS).
- Tooling: `push_update.py --all` full-tree redeploy — excludes `config/settings_data.json`, and
  sends binary assets as base64 `attachment` (`assets/` holds 9 JPEGs; `read_text()` crashed on the
  first). `settings_data.json` untracked from git. `CONVERSION_NOTES.md` platform checklist
  reconciled against this changelog and its push section rewritten to the mechanism actually in use.

## v1.2.0 — 2026-07-18
- Client copy-review pass (`Ichigo_site_review.docx` 校閲ログ, 27 items) applied to the homepage:
  1. **Direction fixed everywhere** — "delivered fresh **to** the Philippines" (hero heading,
     footer blurb).
  2. **New hero lead** — trusted farmers, "flown cold-chain within 48 hours of picking",
     "a little luxury from Japan".
  3. **"Box" generalized** — arrival CTA "View Available Strawberries", shop section
     "Choose your strawberries" / "select the product", farmers eyebrow "behind each
     strawberry", Club feature "One delivery a month".
  4. **Strawberry Club → Ichigo Club** — header nav, Club eyebrow, FAQ answer
     (descriptive "strawberry" wording elsewhere kept, per the review note).
  5. **Statement section** — eyebrow "A little luxury from Japan", new body (sweetness/
     tanginess), "Single-origin · Japan" float tag removed (tag2 now blank-hidden).
  6. **Farmers section** — "Special strawberries come from special farmers." / "Quality
     first — we've selected the finest farmers from all over Japan."
  7. **Journey generalized Chiba → Japan** — eyebrow "The journey", heading "From Japan to
     your door", subtext, step 1 (no Chiba/lot's), map caption + SVG labels ("Our Farm /
     Japan") — the in-map label the review deferred to "design side" is code here, so done.
  8. **Steps** — step 3 drops "punnet by punnet" → "Each order, customs-cleared in Manila
     and quality-inspected."; step 4 → "within two days of leaving the field."
  9. **Club band** — new subtext "A special subscription plan for our Ichigo lovers.",
     "variety and lot" (no "&"), **"Perfect for Gifting" feature removed** → 3-column band
     (`.band-feats` 4→3), new `.band-sub` style.
- Out of scope per the review doc (pending client data): marquee varieties, product cards,
  farmer cards (Tanaka/Sato etc.), news dummy cards.
- Tooling: `bump_version.py` / `push_shopify.py` resolve the repo root from their own file
  location (repo now lives at `~/projects/ichigo-ec` on the Mac server).

## v1.1.0 — 2026-07-07
- Client-review rounds 1 + 2 ported from the static preview into the Liquid theme:
  1. **Removed all 頒布会 text** — arrival marquee, Club eyebrow (now just "The Strawberry
     Club"), FAQ answer, and the homepage FAQ block in `index.json`. English "Strawberry Club"
     kept throughout.
  2. **Removed the "quality you can taste" band** (`index-why`) from the homepage — dropped
     from `templates/index.json` sections + order. The `index-why.liquid` file is left in
     place, unused.
  3. **Merged the nav** — one **Strawberry Club** tab (→ `/pages/shop#club`) replaces the
     old "Subscription" tab in `header.liquid`.
  4. **News & Events teaser** — new `sections/index-news.liquid`, registered before the FAQ.
     Pulls the latest 3 posts from the built-in **News blog** (`blogs.news`) with a graceful,
     clearly-labelled *sample* fallback when the blog is empty. "View all →" links to
     `blogs.news.url` (default `/blogs/news`). Styling ported into `assets/theme.css`.
  5. **Footer social** — Instagram + Facebook links added to `footer.liquid` (placeholder
     handles, no X/Twitter). `<!-- TODO real ichigo handle -->` left for the real URLs.
  6. **Newsletter section removed from the homepage** (`index-newsletter` dropped from
     `index.json`). The "Get notified" popup will be handled by the **Shopify Forms app**
     (installed in Admin — injects the popup); `index-newsletter.liquid` is left unused so
     the demo JS popup is not ported/duplicated.

## v1.0.6 — 2026-06-29
- How-it-works journey map: rebuilt Japan from real GeoJSON prefecture data with **Chiba
  highlighted in place**; added a cropped/zoomed/hovering Chiba callout with the strawberry
  farm inside; mapped the route Chiba farm → **Narita Airport** (animated truck) → Manila →
  warehouse → your door; repositioned + title-cased all map labels (JAPAN/PHILIPPINES kept caps).

## v1.0.5 — 2026-06-24
- Genericized placeholder farm/product copy (5 sections): removed invented specifics —
  grower names, Yame/Fukuoka, Amaou/Skyberry varieties, founding dates, hectares, Brix,
  and mismatched ₱ prices. Kept the one confirmed fact (Chiba, Japan) + generic craft/
  cold-chain language. Real farm details to be filled back in when supplied.

## v1.0.4 — 2026-06-24
- Gift Box: distinct gift product page (`main-product-gift` + `product.gift` template) with
  gift options — recipient, message (200-char), ribbon, deliver-on date, wooden box — as
  line-item properties that flow to cart/order/checkout. Assigned to the Premium Gift Box product.
- Newsletter (#11) confirmed already wired (Shopify customer-capture form); no change needed.

## v1.0.3 — 2026-06-24
- Product page: subscription selector (one-time vs recurring selling plans) — renders
  automatically once a subscription app creates a selling plan on the product. Passes
  `selling_plan` to cart so Shopify checkout shows recurring terms. No-op until a plan exists.
- (Real recurring billing requires the Shopify Subscriptions app + Shopify Payments — platform setup.)

## v1.0.2 — 2026-06-24
- Really fix the product count: wrap the grid in `{% paginate %}` and use
  `paginate.items`. The magic "all" collection only exposes `products` *inside* a
  paginate block, so `products.size`/`products_count` read 0 outside it.
- Subscription links (header / footer / homepage club band) now point to the Club
  product `/products/japanese-strawberry-club` so it's purchasable and checks out
  (one-time; recurring billing still needs a subscription app).

## v1.0.1 — 2026-06-24
- Fix collection page heading/breadcrumb: no longer shows the JA auto-collection
  title "商品" (now an editable heading, default "Our Strawberry Boxes" + "Shop" crumb).
- Fix "Showing 0–0 of 0 products" — use `collection.products.size` (the special "all"
  collection returns 0 for `products_count` even when products render).

## v1.0.0 — 2026-06-24
- Initial versioned release.
- Static HTML → Shopify OS 2.0 Liquid theme (layout/sections/templates/config, 48 files).
- Nav pages created + wired: about / farmers / help / shop.
- Real commerce: 4 products, `/collections/all` product list, product pages with
  add-to-cart, cart → native Shopify checkout.
