# Ichigo Theme — Changelog

Versioning for the **Ichigo-preview** theme (Shopify theme id 186906968344).
The live **Rise** theme is never touched. Bump with `python3 ../bump_version.py [major|minor|patch]`.

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
