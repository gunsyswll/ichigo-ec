# Ichigo Theme — Changelog

Versioning for the **Ichigo-preview** theme (Shopify theme id 186906968344).
The live **Rise** theme is never touched. Bump with `python3 ../bump_version.py [major|minor|patch]`.

## v1.5.6 — 2026-08-11
オーナー「さらに酷くなった、so / what reach になっている」。v1.5.5 の `text-wrap:balance` を撤去。

### なぜ2回外したか — 再現環境がズレていた
ローカル再現の**ルートフォントが 16px、実機は 17.6px**（サイト側の type lift）。
`max-width:52em` の実寸が **832px 対 915px** と1割違い、折り返し位置がまるごとズレていた。
実機で確認して初めて判明。**実画面を見ずに5幅サンプルで判断したのが誤り**だった。

### balance を使わない理由
`text-wrap:balance` は**行長をそろえるだけで、折る位置を保証しない**。
密走査すると 63幅中50幅では節の切れ目に当たるが、**460〜600px では "is" 止まり**になり、
実機 1299px では **"— so" の後ろ**に落ちた。当たり外れのある手段を「直った」と言ってはいけない。

### 採用した方法（確定的）
節の境目に `<br class="lb">` を置き、`.lede .lb{display:inline}` で**常に**折る。
- 当初は `@media(min-width:800px)` で出し分けたが、**実機 760px で元の悪い折り返しに戻った**
  （しきい値の下でフォールバックする以上、境界のすぐ下は必ず壊れる）。しきい値は撤去。
- 狭い幅では各節が内部で折り返すだけで、**節の境目は幅に関係なく守られる**。
- あわせて `and accountable,` を U+00A0 で連結（500px で3行目が "and" 止まりだったため）。

### 実機で確認した結果（Chrome / 実ストア）
| 幅 | 折り返し |
|---|---|
| 1685 / 1440 / 900 / 760px | `…cold‑chain, and delivery` / `— so what reaches you is …` |
| 500px | `…sourcing, customs,` / `cold‑chain, and delivery` / `— so what reaches you is traceable, compliant,` / `and accountable, not grey‑market.` |

スクリーンショットでも目視確認済み。

## v1.5.5 — 2026-08-11
v1.5.4 の直しが浅かったのでやり直した。オーナー「変わっていないです」。

**まず配信を確認した**（公開テーマ 186906968344 / About は `page-about` セクションを描画 /
同じ段落は他に無い / 資産の更新時刻あり）→ **v1.5.4 は確かに反映されていた**。
変わって見えなかったのは、**折り返し位置が "is" の後から "reaches" の後へ2語動いただけ**で、
依然として句の途中だったから。指摘の本質は「行末が中途半端」ではなく
**「文の切れ目で折れていない」**だった。

**やり直し**: 段落に `.lede{text-wrap:balance}` を付けた。実測（640/820/1024/1280/1440px）で
全幅とも**文のヒンジであるダッシュの直前で折れる**ようになった:

```
A single official import partner handles sourcing, customs, cold‑chain, and delivery
— so what reaches you is traceable, compliant, and accountable, not grey‑market.
```

⚠️ **v1.5.4 で入れた `delivery —` 周りの U+00A0 は無効だったと判明。**
UAX#14 では **em ダッシュ自体が改行機会**なので、前後を改行しない空白にしても
ダッシュのところでは折れる。今回はその性質を逆に利用している。
U+2011（`cold‑chain` / `grey‑market` の分割防止）は有効なので残した。

`text-wrap:balance` は短い数行のブロック専用。本文全体には掛けていない（重く、長文に向かない）。
非対応ブラウザでは無視され、v1.5.4 相当の折り返しになる。

## v1.5.4 — 2026-08-11
クライアント指摘「不自然な改行箇所を修正」(About ページ `#importer` の導入文)。

**スクショ1枚に合わせず、実CSS・実フォントで幅を変えて実測した。** 問題は1箇所ではなく
**幅によって3種類**出ていた:

| 幅 | 実測した折り返し | 何が不自然か |
|---|---|---|
| 960–1440px | …what reaches you **is** / traceable, … | 行末が be動詞。指摘のスクショはこれ |
| 640px | …and delivery **—** / so what … | 行末がダッシュだけで途切れる |
| 430px | …not grey**-** / market. | **ハイフン語が行をまたいで割れる** |

**直し方**: 文字は1字も変えず、見えない「改行しない糊」だけを入れた。
`cold‑chain` / `grey‑market` は **U+2011（改行しないハイフン、見た目は通常のハイフンと同じ）**、
`delivery — so` と `you is traceable,` の隙間は **U+00A0（改行しない空白）**。
1440 / 1280 / 1100 / 960 / 820 / 640 / 430 / 390px の8幅で再測し、
**3種類とも解消**、行末に助動詞・ダッシュ・割れたハイフンが残らないことを確認した。

あわせて本文全体の折り返し品質を上げるため `p, li, figcaption, blockquote, .desc, .lead` に
`text-wrap:pretty`（末尾1語だけの行を避ける。非対応ブラウザは無視するだけ）と、
明示的に折り返しを止めたいとき用の `.nb{white-space:nowrap}` を追加。

⚠️ **`cold-chain` などは他にも16箇所あるが、あえて直していない。** それらは
**テーマ設定・テンプレートJSONに入る編集可能な文章**で、U+2011 を仕込むと
クライアントが打ち直した瞬間に消え、しかも同じ文字を手で入力できない。
壊れ方が見えない仕掛けをクライアントの編集領域に置かない、という判断。
ベタ書きのマークアップ（今回の段落）にだけ使う方針を CSS のコメントに明記した。

## v1.5.3 — 2026-08-11
下書きテーマ「Ichigo WORKING (metafield改修)」に入っていた**商品ごとの予約情報**の実装を本番へ移植。
下書きをそのまま公開すると v1.5.2 の修正が巻き戻るため、3方向マージ（base=v1.5.2直前 / theirs=下書き /
ours=現行）で取り込み、競合1件は下書き側を採用した（解決済み値 v1/v2/v3 でガードするほうが正しいため）。

- **商品ごとのメタフィールドで日付を出せるようにした。** `custom.next_arrival` / `reservation_deadline`
  （date型）/ `delivery_window`（テキスト）を商品ページで読み、**空ならセクション設定にフォールバック、
  それも空なら行ごと非表示**。定義4件はストア側に作成済みだった。
- **`custom.sale_status` による状態表示。** `preorder` → バッジ「Pre-order」＋CTA「Pre-order Now」＋
  「ships in the ◯◯ delivery window」の注記、`coming_soon` → バッジ＋**CTAを無効化**、それ以外は
  在庫に応じて In Stock / Sold Out。商品カード（`product-card.liquid`）にも同じバッジを追加。
- **ギフト商品ページ（`main-product-gift.liquid`）にも同じ実装を移植。** 下書きには入っておらず、
  ギフト商品だけ状態表示が出ない不揃いになっていた。CTAの文言はギフト用を維持しつつ
  `preorder` のときだけ「Pre-order Gift」にする。
- CSS: `.pd-status` / `.card-status` / `.pd-status-note` を追加。

**実測検証（本番テーマ・実ストア）**
| 経路 | 結果 |
|---|---|
| `preorder` + 日付3件（通常商品） | バッジ Pre-order / CTA「Pre-order Now」/ 日付3件が商品ごとの値で表示 / 注記あり |
| `coming_soon` | バッジ Coming Soon / **CTAが disabled** / Availability「Coming soon」 |
| `preorder` + 日付2件のみ（ギフト商品） | 埋めた2件だけ表示、未設定の1件は行ごと非表示 |
| 商品カード | 該当商品にだけバッジが出る |
| 全消去後 | 全9商品で日付・バッジともに消え、Sold Out 判定は維持 |

⚠️ **副産物: 8月8日のセッションが残したテスト値を発見・削除した。** tochiotome / mixed-variety の
2商品に `preorder` と架空の日付（2026-09-15 ほか）が残っており、今回メタフィールドを読む実装を
公開した時点で**そのまま本番の商品ページに出る**状態だった。作成時刻（08-08T04:06Z）で当方の
検証値と区別して特定。検証で使った値も含め、**custom名前空間の値は全商品で0件**にして終了。
実在しない日付は入れていない。

## v1.5.2 — 2026-08-11
実画面フロー図を作るために店を一周して見つかった、コード側で直せる2件。

- **定期プランの金額が出ていなかった（Club の「Deliver every month」）。** 原因は
  `selling_plan_allocation` に `selling_plan_id` というプロパティが存在しないこと —
  `{% if a.selling_plan_id == plan.id %}` は永久に偽になり、価格の分岐に一度も入らなかった。
  正しくは `a.selling_plan.id`。お客様は毎月いくら請求されるか分からないまま定期を選べる状態だった。
  `main-product.liquid` / `main-product-gift.liquid` の両方に同じ誤りがあった。
- **商品ページの日付が2025年のまま全商品に出ていた。** これはテンプレートの設定漏れではなく
  **セクションスキーマの `default`**（"March 15, 2025" ほか）だったので、値を保存していない
  すべての商品が同じ日付を継承していた。既定値を空にし、`fact*_value` が空なら行ごと描画しない
  ガードを追加。`product.club.json` に保存済みだった同じ日付も消した。
  → 実在しない日付を出すより出さないほうが正しい、という判断。実際の日付が決まれば
  テーマ設定に入れるだけで戻る。
- 上に伴い、fact が1つだけ（Availability のみ）になったときにグリッドが崩れないよう
  `.pd-facts .f:only-child{grid-column:1/-1}` を追加。
- ついでに「One-time purchase」の金額を `product.price`（全バリアントの最安値）から
  `variant.price`（選択中のバリアント）に変更。単一バリアントでは同じだが、将来バリアントを
  増やしたときに定期側の表示と食い違わなくなる。

- **⚠️ 実は商品ページだけではなかった。** 1商品で直ったのを確認して終わらせず全9商品を検査したところ、
  Club とギフト以外は**まだ2025年のまま**だった。原因は **git と実テーマの乖離** —
  リポジトリの `templates/product.json` は `{}` なのに、**ライブ側にはテーマエディタで保存された
  日付が入っていた**（`fact1_value: "March 15, 2025"` ほか）。スキーマ既定値を空にしても、保存済みの
  値は上書きされない。ライブの `templates/product.json` / `templates/index.json` を Admin API で
  読み、値を空にして書き戻したうえで、**リポジトリ側もライブの内容に同期**した。
- 同じ日付はトップページの arrival strip（`index-arrival.liquid`、スキーマ既定値＋index.json 保存値）と
  Shop ページのヒーロー（`page-shop.liquid` に**ベタ書き**）にも出ていた。前者は空ガード＋値クリア、
  後者は設定項目化（`next_arrival` / `reservation_deadline`、空なら非表示）に変更。
- 検証は全ページ横断で実施: `/` `/pages/shop` `/pages/help` `/pages/about` `/collections/all` と
  全9商品ページの本文から `2025` と `March \d+` が消えたことを確認（Judge.me の内部キー
  `all_reviews_widget_v2025_*` は顧客に見えないため対象外）。1カラムになったブロックの見た目も実画面で確認。

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
