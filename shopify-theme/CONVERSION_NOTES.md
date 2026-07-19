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

Status re-verified against `CHANGELOG.md` and the current theme files (2026-07-19).

1. **Pages** — DONE (v1.0.0). Nav pages `about` / `farmers` / `help` / `shop` were created
   in Shopify Admin and assigned their templates (`page.about`, `page.farmers`,
   `page.help`, `page.shop`); nav/footer links resolve to `/pages/<handle>`. The
   pre-launch countdown page (`templates/page.launch.liquid` + `layout/launch.liquid`)
   ships in the theme too but is deliberately not linked from primary nav — its own Page
   (handle `launch`) still needs creating/confirming in Admin whenever the pre-launch
   campaign is scheduled to go live.
2. **Products & collections** — DONE (v1.0.0; product-count/heading bugs fixed in
   v1.0.1/v1.0.2). 4 real products, a working `/collections/all` product list (correctly
   wrapped in `{% paginate %}`), product pages with add-to-cart, and cart → native
   Shopify checkout. `snippets/product-card.liquid` is the drop-in card the collection
   loop uses.
3. **Pre-order / subscription apps** — OPEN. "Reserve / Pre-order" and the Ichigo Club are
   business flows, not built-in Shopify. `sections/main-product.liquid` and
   `sections/main-product-gift.liquid` already render a one-time/recurring selling-plan
   picker (`product.selling_plan_groups`) and pass `selling_plan` to the cart, but it's a
   no-op until a subscription app (Shopify Subscriptions / Recharge) actually creates a
   selling plan on the product — and a pre-order app is still needed for the
   reserve-by-arrival model. Install both and wire the CTAs to them.
4. **Metafields** — OPEN. The product page still surfaces facts (arrival date, deadline,
   delivery window, availability, Brix, farm, variety, spec tables) from placeholder
   defaults — see the comments in `sections/main-product.liquid` and
   `sections/main-product-gift.liquid` ("settings so the page works before product
   metafields exist"). Model these as real product metafields and bind them for
   per-product data.
5. **Newsletter** — DONE (capture confirmed wired v1.0.4; mechanism changed in v1.1.0).
   A native `{% form 'customer' %}` capture (adds a customer tagged `newsletter`) was
   built into `index-newsletter.liquid` and confirmed working in v1.0.4. In v1.1.0 the
   homepage section was dropped from `templates/index.json` in favor of the **Shopify
   Forms app** (installed in Admin) driving the "Get notified" popup instead, so the two
   capture paths wouldn't double up. No further theme work needed here; just confirm the
   Forms app (or an ESP integration) is pointed at a real list in Admin.
6. **Policies** — OPEN. `footer.liquid` already links `shop.privacy_policy.url` /
   `terms_of_service.url` / `refund_policy.url` / `shipping_policy.url` with sensible
   fallbacks, but the policies themselves still need to be written and saved under
   Settings → Policies — once they are, the footer links resolve automatically with no
   theme change required.
7. **Cache-busting** — DONE (v1.0.0, structural rather than a task). Every theme asset
   reference goes through Shopify's `asset_url` filter (`layout/theme.liquid`,
   `layout/launch.liquid`, and every section that references an image/CSS/JS asset),
   which fingerprints URLs automatically. The manual `?v=` build step from the static
   site was dropped in the conversion and never needed reintroducing.

## Pushing the theme

There's no Shopify CLI in this environment — everything goes through the **Admin Asset
API** directly, authenticated with a custom-app client-credentials token. The token is
fetched fresh on every run via the `client_credentials` grant, using store/client
credentials read from `~/.ichigo-shopify.env` (`SHOPIFY_STORE`, `SHOPIFY_CLIENTID`,
`SHOPIFY_SECRET`). Reference that file **by name only** — never print or inline the token
value (or the client secret) in chat, logs, or commits.

Three scripts, three jobs, all run from the repo root (`~/projects/ichigo-ec`):

- **`push_shopify.py`** — creates a **new, unpublished** theme from the full
  `shopify-theme/` tree (safe: zero impact on the live storefront until someone publishes
  it from Admin). Use this for a from-scratch preview/review pass.
- **`push_update.py`** — updates the **live** Ichigo-preview theme (id `186906968344`) in
  place, one asset at a time via `PUT .../themes/{id}/assets.json`:
  - `python3 push_update.py <path> [<path> ...]` — push specific files, paths relative to
    `shopify-theme/` (e.g. `sections/index-hero.liquid`).
  - `python3 push_update.py --since <git-ref>` — push every `shopify-theme/` file changed
    since `<git-ref>`.
  - `python3 push_update.py --all` — full-tree redeploy: every file under
    `assets/ config/ layout/ locales/ sections/ snippets/ templates/ blocks/`.
    **`config/settings_data.json` is always excluded from `--all`** — it holds live
    theme-editor state (colors, section settings, block content the client has configured
    in Online Store → Customize), and overwriting it from the repo would clobber those
    saved settings (this happened on 2026-07-18). Push it explicitly by filename only if
    you genuinely mean to.
- **`bump_version.py [major|minor|patch]`** — bumps `shopify-theme/VERSION`, syncs it into
  `config/settings_schema.json` (`theme_info.theme_version`), renames the live theme to
  `Ichigo-preview · vX.Y.Z`, and pushes the updated `settings_schema.json` asset. Run
  after a batch of changes lands. Never touches the separate, always-untouched **Rise**
  theme.

Validation before any push is still self-check based (no `shopify theme check` available
here): every template/section/config JSON file parses, `layout/theme.liquid` contains
`{{ content_for_header }}` + `{{ content_for_layout }}`, every section referenced by a
template exists, and the SVG maps are byte-identical to source.
