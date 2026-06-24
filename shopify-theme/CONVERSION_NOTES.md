# Ichigo — Shopify Liquid theme

This is the static Ichigo site (`~/ichigo-ec/`) re-architected as a real Shopify
Online Store 2.0 theme. **The visual design is preserved verbatim** — `assets/styles.css`
and `assets/app.js` were copied byte-for-byte (only image-path resolution was rewired,
see below), and the three large hand-drawn map SVGs (Japan ship-route, Japan farms,
Metro-Manila delivery) are byte-identical to the originals.

The original static files (`index.html`, `src/*.body.html`, `partials/*`, `assets/`,
`404.html`, `launch.html`) are left untouched as the design source-of-truth / preview.

## Layout / structure

```
layout/theme.liquid     standard chrome: head + announce + header + content + footer
layout/launch.liquid    slim chrome for the launch landing page (no nav/footer)
sections/               one section per page body; index split into 11 sections
templates/*.json        OS 2.0 JSON templates (index, product, page.*, 404)
templates/page.launch.liquid   Liquid template (needs {% layout 'launch' %})
config/                 settings_schema.json + settings_data.json
locales/en.default.json minimal locale
snippets/               berry-icon, product-card (reusable)
assets/                 theme.css, theme.js, *.jpg (flat — no subdirs)
```

### Index page sections (all editable in the theme editor, with presets + blocks)
`index-hero`, `index-arrival`, `index-boxes`, `index-why`, `index-statement`,
`index-farmers`, `index-howitworks` (the ship-route map), `index-club`,
`index-info`, `index-newsletter`, `index-faq`.

### Page sections
`page-about`, `page-farmers`, `page-help`, `page-shop`, `page-product`,
`page-404`, `launch`.

## Image-asset approach (IMPORTANT)

Shopify theme assets are **flat** — there are no subdirectories, so the original
`assets/img/str-red.jpg` becomes `str-red.jpg` reachable via `{{ 'str-red.jpg' | asset_url }}`.

In the original site the photos are **injected by JavaScript** (`app.js` walks `.ph`
blocks and sets `background-image: url('assets/img/<name>.jpg')`). Rather than hardcode
CDN URLs (which would defeat editability), the layout exposes a filename→CDN-URL map:

```js
window.ICHIGO_IMG = { "str-red": "{{ 'str-red.jpg' | asset_url }}", ... };
```

`theme.js` reads that map (`MAP[n] || "assets/img/"+n+".jpg"` fallback). This keeps the
JS identical in behavior and still works standalone.

Two non-JS image refs were rewired:
- CSS `.berry-orb` background → `var(--str-one-img)`, set on `:root` in both layouts.
- The homepage `.ph3d` statement photo → `index-statement` section now uses an
  `image_picker` setting and falls back to `{{ 'str-red.jpg' | asset_url }}`.

### Fidelity caveats
- All photo "blocks" are still the **placeholder strawberry/people stock set** from the
  static design (the same shots the static preview uses), assigned round-robin by `app.js`.
  Swap in real product/farm photography by replacing the JPGs in `assets/` (same names)
  or by wiring the sections to real `image_picker` / product images.
- The locked palette/fonts are exposed as theme settings and re-applied to the CSS
  variables `--red`/`--cream`/`--greige` in the layout. **Changing the accent color only
  updates the CSS variable** — the many hand-tuned inline SVG fills (`#D94050`, etc.) are
  literal in the markup and will not follow. Keep the defaults to preserve the design.

## What's editable in the theme editor
- Announcement bar text + link.
- Header brand, nav menu (link_list), CTA label.
- Footer brand + blurb (policy links auto-resolve to shop policies).
- Every homepage section: headings, eyebrows, lead/body copy, CTA labels+URLs, and
  block lists (box cards, why-reasons, farmer cards, club features, info trio, FAQ Q&As).
- Statement feature image.
- Launch landing: the countdown's first-arrival date.
- Global colors (Ripe Red / off-white / greige) and heading/body fonts.

The page bodies (about/farmers/help/shop/product/404) are converted verbatim and expose
a section name (editable position/visibility); their rich inner copy is in the section
markup rather than per-field settings, because those pages are dense editorial layouts.

## Still needs Shopify-platform setup before it's a working store
1. **Pages** — create Shopify Pages with handles `about`, `farmers`, `help`, `shop`,
   `launch` and assign each the matching template (`page.about`, `page.farmers`,
   `page.help`, `page.shop`, `page.launch`). Nav/footer links point at `/pages/<handle>`.
2. **Products & collections** — the shop/product/box cards are static design placeholders
   linking to `routes.all_products_collection_url`. Create real products, a default
   collection, and (optionally) refactor `page-shop`/`page-product` to loop over
   `collection.products` / use the `product` object + an add-to-cart `{% form 'product' %}`.
   The `snippets/product-card.liquid` is provided as a drop-in for that loop.
3. **Pre-order / subscription apps** — "Reserve / Pre-order" and the 頒布会 Club are
   business flows, not built-in Shopify. Install a pre-order app (e.g. for the
   reserve-by-arrival model) and a subscription app (Shopify Subscriptions / Recharge)
   and wire the CTAs to them.
4. **Metafields** — the product page surfaces facts (arrival date, deadline, delivery
   window, availability, Brix, farm, variety, spec tables). Model these as product
   metafields and bind them in `page-product` for real per-product data.
5. **Newsletter** — `index-newsletter` uses the native `{% form 'customer' %}` (adds a
   customer tagged `newsletter`). Connect to your email tool if you want a dedicated list.
6. **Policies** — set Privacy/Terms/Refund/Shipping in Settings → Policies; the footer
   auto-links them (`shop.privacy_policy.url`, etc.) with sensible fallbacks.
7. **Cache-busting** — Shopify's `asset_url` filter fingerprints assets automatically,
   so the manual `?v=` build step from the static site is no longer needed.

## Pushing the theme

The `shopify` CLI was not installed in this environment, so validation was done by
self-checks (all template/section/config JSON parses; layout contains
`{{ content_for_header }}` + `{{ content_for_layout }}`; every section referenced by a
template exists; SVG maps verified byte-identical). To push, install the Shopify CLI,
then from this directory:

```
cd ~/ichigo-ec/shopify-theme
shopify login --store <your-store>.myshopify.com
shopify theme check        # fix anything it flags
shopify theme push         # or: shopify theme dev   (live local preview)
```

`shopify theme push` uploads as a new unpublished theme by default; publish it from the
Shopify admin (Online Store → Themes) once you've reviewed it.
