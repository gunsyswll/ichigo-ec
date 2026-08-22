# Ichigo Theme — Changelog

Versioning for the **Ichigo-preview** theme (Shopify theme id 186906968344).
The live **Rise** theme is never touched. Bump with `python3 ../bump_version.py [major|minor|patch]`.

## v1.10.0 — 2026-08-11
オーナー選択「B: 導線をコレクションへ移し、Search & Discovery を入れて絞り込みも実装」。

### やったこと
1. **Shop ページの中身をコレクションページに移植**（見出し・説明・NEXT ARRIVAL / AVAILABLE BOXES・
   How it works / Help へのリンク）。`sections/main-collection.liquid`。
2. **ヘッダーの「Shop / Reserve」を `/collections/all` に変更。**（フッターの Subscription も
   `/pages/shop#club` → 商品ページ直リンクに修正）
3. **絞り込みUIを実装**（`collection.filters` を描画）。並び替えと**同じフォーム**に入れてあるので、
   並び替えても絞り込みが消えない。
4. **Search & Discovery（Shopify 公式・無料）をインストール**（オーナー承認済み）。
   絞り込みラベルを日本語→英語に変更（`出品状況`→`Availability`、`価格`→`Price`）。

### 動くもの（実機確認）
| 機能 | 状態 |
|---|---|
| 並び替え9種（価格の安い順/高い順ほか） | ✅ |
| **在庫あり / 在庫なし の絞り込み** | ✅ In stock 8 / Out of stock 1 → 押すと8件に絞られる |
| 絞り込み＋並び替えの同時使用 | ✅ 在庫ありのまま価格の安い順 = ₱1,600 → ₱4,800 |
| Clear all | ✅ |

### 🔴 価格帯フィルタは使えません（Shopify 側の制約）
アプリで「Price」フィルタを設定しても、**ストアフロントに出てきません**。
原因は**通貨の自動変換**です。実測: `collection.filters` が返すのは Availability の1件のみ／
このストアは基準通貨 JPY・唯一のマーケット「フィリピン」が `localCurrencies: true`（自動変換）。
価格が固定額でないため Shopify が価格帯フィルタを出せません。

**回避策:**
- **PHP の固定価格を設定する**（Pending #10 と同じ話）。固定すれば価格帯フィルタが使えるはず（要再検証）。
- それまでは**「価格の安い順／高い順」の並び替え**で代替（実装済み・すぐ使える）。

### 残っている判断
`/pages/shop` は生きたまま、どこからもリンクされていない状態です。SEO 上は
`/collections/all` へリダイレクトするのが定石ですが、URL の付け替えはオーナー判断。

### 実装メモ
- 絞り込みの見出しは Shopify 側の言語設定に引きずられて**日本語で返ってくる**ことがある
  （実測: `出品状況`）。テーマ側でも既知の絞り込みは英語ラベルに置換している（二重の保険）。
- 並び替えと絞り込みを別フォームにすると、片方を操作したときにもう片方が URL から落ちる。1フォームにすること。

## v1.9.0 — 2026-08-11
オーナー承認「案1: 残り僅少のときだけ数字を出す」。**在庫数の自動表示を実装。**

### 動き
| 場所 | 在庫が多いとき | 少ないとき |
|---|---|---|
| 商品カード（Shop / ホーム / コレクション） | 何も出ない | 価格の下に赤字で **Only 10 left** |
| 商品ページの Availability | In stock | **Only 10 left** |
| ホーム・Shop の Available Boxes | Limited | **Only 24 Boxes Left**（全商品の合計） |

数字は Shopify の在庫からその都度読むので**自動更新**。手入力の欄はありません。

### しきい値はテーマ設定から変更可
テーマ設定 → **在庫表示**
- 「商品ごと: 残り僅少とみなす数」= **10**（0 にすると商品側の表示はオフ）
- 「サイト全体: Available Boxes に数字を出す合計在庫」= **30**（0 でオフ）

### 実装
`snippets/stock-left.liquid`（商品単位）と `snippets/stock-total.liquid`（サイト合計）を新設し、
商品ページ2種・商品カード・ホーム・Shop から呼ぶ。在庫を追跡していない商品は数量0で返るため、
`inventory_management == 'shopify'` のものだけを対象にしている。

### 実機確認
- Luxury Wooden Gift Box（在庫10＝しきい値ちょうど）→ カード「Only 10 left」／商品ページ「Only 10 left」✅
- Standard（25）→ 何も出ない・In stock のまま ✅
- Sky Berry（0）→ 売り切れ表示のまま、数字は出ない ✅
- 合計148 > 30 → Available Boxes は Limited ✅
- **しきい値を一時的に200へ上げて低在庫側も確認** → 「Only 148 Boxes Left」✅（30に戻し済み・確認済み）

### 注意
- ⚠️ **数字は数分古いことがある**（Shopify のページキャッシュ）。「残り1」表示中に売り切れる可能性は残る。
- ⚠️ 合計の集計は Liquid のループ上限で**50商品まで**。現在9商品なので問題ないが、超えたら集計方法を変えること（スニペットにコメント済み）。
- 残り僅少の行が入るぶん、そのカードだけ価格の位置が1行ぶん上がる（**ボタンの位置はそろったまま**）。
  全カードで行の高さを予約して価格もそろえることは可能。

## v1.8.3 — 2026-08-11
オーナー「全て10月1日に仮で設定」。**入荷予定日を全商品＋2ページに入れた。**

| 場所 | 入れ方 | 値 |
|---|---|---|
| 全10商品 | メタフィールド `custom.next_arrival`（date型・Admin API） | `2026-10-01` |
| ホームの Next Arrival 帯 | `templates/index.json` の `arrival_date`（手入力テキスト） | `October 1, 2026` |
| Shop ページのヘッダー | `templates/page.shop.json` の `next_arrival`（手入力テキスト） | `October 1, 2026` |

実機確認: ホーム帯 / Shop ヘッダー / 商品ページ（通常・Club・ギフトの3テンプレートすべて）で
`October 1, 2026` を表示。

### 入れていないもの（意図的）
- **予約締切（Reservation Deadline）** と **配送予定（Delivery Window）** は空のまま。
  締切は「入荷の何日前か」という運用ルールが決まらないと決められず、
  当てずっぽうの日付を出すとお客様への約束になるため。ルールをもらえば同じ方法で一括投入できる。

### ⚠️ 日付の置き場が3か所に分かれている
商品はメタフィールド、ホームと Shop は手入力テキスト。**更新時に3か所直す必要があり、
片方だけ古いという事故が起きる。** ホームと Shop も「一番近い `next_arrival` を自動で拾う」
作りに変えられる（当方で実装可・追加費用なし）。オーナー判断待ち。

⚠️ 2026-10-01 は**仮の日付**。実際の入荷が決まったら差し替えること。

## v1.8.2 — 2026-08-11
オーナー「出来ていますが、上下の幅が狭く感じる」。ウェイトリストのページに余白を足した。

見出しとフォームだけの短いページなので、他ページの余白（`section{padding:84px 0}`）に対して
明らかに詰まって見えていた。3か所を足している。

| 場所 | 変更前 | 変更後 |
|---|---|---|
| ピンクの見出し帯 | 54px（全ページ共通） | **84px**（このページだけ `.page-hero--waitlist`） |
| フォームのブロック余白 | 上0 / 下24px | **上64 / 下64px**（**アプリ側の上限が64px**） |
| フォームのセクション | 0 | **上下28px**（上限の足りないぶんをテーマ側で補う） |

結果（実測 1440px）: 帯の下端 → フォーム上端 **92px**、フォーム下端 → フッター **92px**。
他セクションの 84px と揃う。500px でも確認済み。

⚠️ セクションへの余白は `[id$="__forms"]` で当てている。テンプレートでセクション名を `forms` に
したのでこの id になる。**他テンプレートに `forms` という名前のセクションを作ると巻き込む**
（現時点で該当なし・確認済み）。

## v1.8.1 — 2026-08-11
オーナー指摘「デザインを揃えて、アプリ側に変更できるはず」。**指摘のとおりでした。**

v1.8.0 で「ボタンの色はアプリに設定が無い」と書いたのは**誤り**。色の設定は
Forms アプリの管理画面ではなく、**テーマエディタでアプリブロックを選んだときの設定パネル**に
ある（色5つ・テキスト配置・フォーム配置・余白4つ）。実画面で操作して合わせた。

| 設定 | 変更前 | 変更後 |
|---|---|---|
| テキスト | `#202020` | **`#2B2420`**（サイトの `--ink`） |
| ボタンの背景 | `#202020` | **`#D94050`**（`--red`） |
| ボタンのラベル | `#FFFFFF` | 据え置き |
| リンク | `#1878B9` | **`#D94050`** |
| エラー | `#E02229` | 据え置き（エラーはブランド色と分けたいので変えない） |

### この設定は `templates/page.waitlist.json` に保存される
テーマエディタで保存すると、アプリブロックの `settings` にキーが書き込まれる。
リポジトリ側にも取り込み済みなので、**今後の色変更は JSON を1行直して push するだけでよい**
（`text_color` / `button_background_color` / `button_label_color` / `links_color` /
`errors_color` / `text_alignment` / `form_alignment` / `padding_*`）。

### 残る差（設定項目が無い）
サイトのボタンは**角丸100px（ピル型）**だが、フォームのボタンは角丸が浅い。
アプリブロックに角丸の設定は無く、フォームの中身は外部から読み込まれるためテーマの CSS も届かない。
色・フォント・幅は一致した。

## v1.8.0 — 2026-08-11
オーナー決定「C、Shopify Forms で本物のウェイトリストを作って」。**実装・稼働確認済み。**

### できたもの
**`/pages/waitlist`** — 名前とメールを入れると **Shopify の顧客として登録**され、
`waitlist` タグが付き、メールマーケティングの同意も記録される。
以後この人たちにお知らせを送れる（顧客管理 → タグ `waitlist` で絞り込み）。

| 部品 | 内容 |
|---|---|
| フォーム | Shopify Forms（公式・無料、導入済みだった）／**Form ID 1123369**／インライン型 |
| ページ | `templates/page.waitlist.json` ＋ `sections/page-waitlist.liquid`（見出しは当方、フォームはアプリブロック） |
| 導線 | ホームの **Join the Waitlist** ボタン → `/pages/waitlist`（それまでは商品一覧に落ちていた）／フッター「Sold Out / Waitlist」も同ページへ |

### 実機で通した確認（テスト送信2回、後で顧客レコードは削除済み）
| 確認 | 結果 |
|---|---|
| 送信 → 顧客が作られるか | ✅ 作成される |
| メール同意 | ✅ `SUBSCRIBED`（single opt-in、同意日時つき） |
| `waitlist` タグ | ✅ 付く（**1回目は付かなかった** — タグ入力が候補をクリックするまで確定しない仕様。修正して再テスト） |
| 完了メッセージ | ✅「You're on the list」に差し替え |
| ヘッダー・フッター | ✅ 通常ページとして表示される |

### メモ
- アプリが自動生成した `templates/page.Forms - Waitlist.json`（フォームだけの素のページ）は
  **削除**し、サイトのデザインに合わせた `page.waitlist.json` に置き換えた。
- フォントはアプリ側の設定で **Libre Baskerville / Outfit** に合わせた（既定は Arial）。
- **色も合わせた（v1.8.1 で追記）。**
- ⚠️ **メール通知は OFF のまま**にした。通知先がストア設定のアドレス
  （`s-yamanaka@credo-system.com`）になるため、送信の可否はオーナー判断。
- ⚠️ 未公開のローンチページ (`sections/launch.liquid`) の登録フォームは**依然として張りぼて**
  （メールをどこにも送らず「You're on the list」と出すだけ）。到達不能だが、公開するなら
  この本物のフォームに差し替えること。

## v1.7.6 — 2026-08-11
【Shop】オーナー指定の説明文に差し替え（`sections/page-shop.liquid`）。

修正前: `Browse all available strawberry boxes. Reserve your box before the next arrival.`
修正後: `Browse all available strawberry boxes. You can also Reserve your box before the next arrival.`

指定どおり `Reserve` の頭文字は大文字のまま（ボタン名と合わせる意図と解釈）。

実機確認: 1440px は1行、500px は文の切れ目（`You can also` の後）で2行に折れる。
不自然な改行位置なし。

## v1.7.5 — 2026-08-11
【Shop】オーナー「見出しを `Shop & Reserve` → `Shop or Reserve` に」。

サイト内の `Shop & Reserve` は3か所あり、すべて `or` に統一した。

| 場所 | 内容 |
|---|---|
| `sections/page-shop.liquid` | Shop ページの見出し（指示の対象） |
| `sections/index-boxes.liquid` + `templates/index.json` | **ホーム**の商品グリッド上の小文字ラベル |
| Shopify のページ設定（`/pages/shop` の**ページ名**） | ブラウザのタブ・OGP・検索結果に出ていた |

ホームのラベルと Shopify のページ名は指示の【Shop】ページ外だが、**同じ文字列**であり、
片方だけ残すとタブに `Shop & Reserve`・本文に `Shop or Reserve` と食い違う（実際に出ていた）。
戻す場合はそれぞれ1行。

実機確認: `/pages/shop` の h1・`<title>`・og:title すべて `Shop or Reserve`、
ページ内に `&` 版は残っていない。ハンドル `/pages/shop` は変更なし。

## v1.7.4 — 2026-08-11
【Ichigo Club】オーナー「サブスク商品なので One-time Purchase の選択肢は不要」。

### 直し方 — テーマで隠すのではなく、商品を「定期のみ」にした
UI を消すだけだと、カートに直接投げれば都度購入が通ってしまう。Shopify 側の
`requiresSellingPlan` を **true** にして、**Shopify 自身が都度購入を拒否**するようにした。

- 商品 `Japanese Strawberry Club`（ICH-003）: `requiresSellingPlan` false → **true**
- テーマは `product.requires_selling_plan` を見て One-time の行を出さない
  → 商品設定を戻せばテーマは自動的に元に戻る（テーマ側にハードコードなし）

### 実装
`snippets/purchase-options.liquid` を新設し、`main-product` と `main-product-gift` の
**同一の重複ブロック（879文字 × 2）を置き換え**。定期プランが1つだけのときはラジオを出さず、
選択済みの見た目で1行だけ表示し、値は hidden で送る。

### 実機確認（walk the flow）
| 確認 | 結果 |
|---|---|
| 商品ページ | One-time の行が消え、`Deliver every month — ₱4,800.00 / delivery` の1行のみ |
| 定期でカート投入 | 成功。`selling_plan_allocation.selling_plan` = Deliver every month (6988792088) |
| **都度購入を強行**（`selling_plan` 無しで `/cart/add.js`） | **422 で拒否**「Variant can only be purchased with a selling plan.」カート0件 |
| 他商品 | Premium Gift Box / Standard Box とも購入オプション欄なし・Liquid エラーなし |

### 補足
- ICH-010「Ichigo Club — 3ヶ月前払い」は下書き・定期プラン未設定（Pending #31）。
  公開するときは同じく `requiresSellingPlan` を true にする。
- ⚠️ この商品は **決済がまだ通らない**（Pending #3、テスト決済が定期課金に非対応）。
  今回の変更で都度購入という抜け道が塞がったので、**Club は #3 完了まで購入不可**になる。

## v1.7.3 — 2026-08-11
【Farmers】オーナー追加指示「How we select our partner farms を見出しにする」。

v1.7.2 で「Our standard for every grower」の見出しを消したブロックは、小文字ラベル
`HOW WE SELECT OUR PARTNER FARMS` だけが残っていた。そのラベルを**見出し（h2）に昇格**し、
小文字ラベルは無くした（同じ文字列を2段に重ねないため）。

実機確認（1440px）: 見出し1行、下の4カードとの間隔は 48px で他セクションと同じ。

## v1.7.2 — 2026-08-11
【Farmers】クライアント指摘3件。すべて `sections/page-farmers.liquid`。

| # | 指摘 | 対応 |
|---|---|---|
| 1 | 「Where **your** strawberries grow」→「Where **our** strawberries grow」 | 修正 |
| 2 | 「Our Standard for every grower」を削除 | 見出しの行だけ削除（オーナー確認済み）。小文字ラベル「HOW WE SELECT OUR PARTNER FARMS」と4つのカードは残す |
| 3 | 以前の文言修正が未反映（「We partner with only two growers」のまま） | 「We've selected the finest farmers from all over Japan」に差し替え |

### #3 の出典
2026-07-18 の校閲 docx 項目17 が
`We work with two growers only, so we can tell their full story.`
→ `Quality first. We've selected the finest farmers from all over Japan.`
と指示していた。**これはホームの Meet the Farmers に適用済み**だったが、
Farmers ページの見出しは同じ主張の**別の文**（`We partner with only two growers`）で、
校閲 docx が行単位で対象を指定していたため取りこぼしていた。承認済みの文言に合わせて差し替え。

### ⚠️ 同じ主張がもう1か所ある（未変更）
`sections/page-about.liquid:25` に **「Two farms we know by name, not a marketplace.」**。
ABOUT ページなので今回の指示範囲外。残すか直すかは要確認。

## v1.7.1 — 2026-08-11
オーナー「Purchase ボタンが align していない」。

### 原因
商品カードは `.card` 自体は flex 縦並びだったが、間に挟まる `.card-wrap`（お気に入りハートを
重ねるためのラッパー）が**グリッドの高さいっぱいに伸びていなかった**ため、カードの高さ＝中身の高さ
になっていた。説明文が2行の商品と3行の商品でカードの高さが変わり、ボタンの位置がずれていた。

### 修正（`assets/theme.css`）
```css
.card-wrap{display:flex}
.card-wrap>.card{flex:1;min-width:0}
.card .price{margin-top:auto}   /* 2px → auto */
```
価格から下を下端に寄せたので、**ボタンだけでなく価格の行もそろう**。

### 実機確認（1440px、実測値）
| ページ | 行 | カード高さ | ボタン下端 |
|---|---|---|---|
| ホーム | 1行目3枚 | 558px 一致 | 一致 |
| /pages/shop | 3行 × 3枚 | 558px 一致 | 各行で一致 |
| /collections/all | 3行 × 3枚 | 558px 一致 | 各行で一致 |

## v1.7.0 — 2026-08-11
【Shop】オーナー「売り切れは画像に Sold Out ＋ ボタンは Reserve、在庫ありは Purchase」。

### 変更（`snippets/product-card.liquid`）
| 状態 | 変更前 | 変更後 |
|---|---|---|
| 在庫あり | Reserve（赤） | **Purchase**（赤） |
| 売り切れ | View（枠線） | **Reserve**（枠線）＋ 画像に SOLD OUT（従来どおり） |
| Coming Soon / Pre-order | Reserve | **Coming Soon / Pre-order** |

Coming Soon / Pre-order を分けたのは、商品ページ側のボタンがその文言で**押せない状態**に
なっているため。一律 Purchase にすると「買えるように見えて買えない」カードができる。

このカードは Shop・ホームの商品グリッド・コレクションページで共用なので、3か所すべてに反映される。

### 実機確認（1440px, /pages/shop）
Sky Berry Limited Box（在庫0）= SOLD OUT ＋ Reserve、他8点 = Purchase。

### 🔴 未解決: 売り切れの Reserve は行き止まり
Reserve を押すと商品ページに行くが、そこのボタンは **`disabled` の "Sold Out"**（実測）。
予約の仕組みはサイトに1つも入っていない（Pending #28）。ボタン文言だけ先に変えた状態なので、
**予約方式（#28）が決まるまでは「予約できそうに見えて予約できない」**。

## v1.6.9 — 2026-08-11
【HOME】オーナー「ヘッダーに SNS のロゴを設置してほしい」。

### 入れた場所
| 幅 | 表示 |
|---|---|
| 1120px 以上 | ヘッダー右に Instagram / Facebook の丸アイコン（操作アイコンとの間に細い区切り線） |
| 921–1119px | **非表示**（下記の理由） |
| 920px 以下 | バーガーメニューを開いた中に、区切り線＋ラベル付きで表示 |

⚠️ **921–1119px でヘッダーに出せない理由（実測）**: 1024px ではアイコンを足す前から
ブランド名とナビの間隔が **0px**（＝すでに満杯）で、足すと "Shop / Reserve" が2行に折れた。
ナビの余白を削れば入るが、既存レイアウトを痩せさせることになるので出さない判断。
この幅でも フッター と Follow us セクションの SNS リンクは出る。

### URL を1か所に統合
これまで Instagram / Facebook の URL は **フッター**と **Follow us セクション**で別々に持っていて、
フッター側は未入力のまま＝**アイコンが出ていなかった**。テーマ設定に **「SNS」グループ**を新設し、
ヘッダー・フッター・Follow us の3か所すべてがそこを参照するようにした。
セクション側に入れた場合だけそちらが優先される（上書き用）。

- 新規 `snippets/social-icons.liquid`（nav / drawer / footer の3バリアント）
- `config/settings_schema.json` に `social_instagram_url` / `social_facebook_url`
- `templates/index.json` `templates/page.shop.json` からプレースホルダ URL を削除（グローバル設定に一本化）
- 副次的な修正: フッターの SNS アイコンが表示されるようになった

🔴 **URL はまだ仮**（`https://instagram.com` / `https://facebook.com` ＝各サービスのトップ）。
実アカウントの URL をもらったら、テーマ設定 → SNS の2欄を書き換えるだけで3か所すべてに反映される。

## v1.6.8 — 2026-08-11
オーナー「`Picked at dawn → at your door in ~36–48 hours.` と DAY 0 の間隔を 30px（同じ）に」。

### 実測と修正
DAY 0 のピル下端 → ship-banner 上端 = **25px** だった。
偶数カードはタイムラインの箱から 22px はみ出しているため、
実際の隙間 = `timeline下端 + banner上マージン46px − カード下端`。
`.geomap + .timeline` の `padding-bottom` を **56 → 61px** に。

### 結果（実機 1440px）
| 箇所 | 隙間 |
|---|---|
| 地図 → 01 / 03 | 30px |
| 丸 → 02 / 04 | 30px |
| **DAY 0 → バナー** | **30.5px** |

⚠️ **30.0px ちょうどには詰められなかった。** 60px だと 29.5px、61px だと 30.5px で、
中間の 60.5px を指定しても Chrome 側で丸められて 29.5px のままだった（サブピクセルの丸め）。
0.5px の差は視認できないため 61px 側を採用。

## v1.6.7 — 2026-08-11
オーナー「今の間隔を2倍に」。How it works のカード〜軸／カード〜地図の隙間 15px → **30px**。

### 隙間の正体
15px は `.tl-card{bottom/top: calc(50% + 52px)}` と **丸の半径 37px** の差だった（52−37=15）。
→ **52px → 67px** で 30px になる。奇数(01/03)・偶数(02/04)とも同じ値なので4つ同時に効く。

### 一度失敗している（記録）
最初は上マージンを 77→92px（+15）にしたが、**01/03 は 15px のまま**だった。
奇数カードは軸から離れる＝**上へ15px動く**ので、マージンの +15 と相殺されていた。
必要なのは「相殺分15px ＋ 隙間を広げる分15px」で **+30px**。→ 上マージン 77 → **107px**。

### 確認（実機 1440px）
**01=30 / 02=30 / 03=30 / 04=30px**（4つとも一致）。
カードと丸をつなぐ縦線（30px）がちょうど丸の縁まで届くようになり、以前より収まりが良い。
下の「Picked at dawn →」帯との隙間は 24px を維持。

⚠️ `.tl-card` は About のタイムラインでも使う共有クラスなので、
**`.geomap` が直前にある場合だけ**に限定してある（指摘は How it works のみ）。

## v1.6.6 — 2026-08-11
オーナー指摘【How it works】PC で「From Japan to your door」の 01 と 03 が上のイラストに被る。
02・04 と同じだけ空けたい。

### 実測（1440px）
| | 値 |
|---|---|
| 地図イラストの下端 | 180px |
| **カード01の上端** | **178px** ← 2px 食い込んでいた |
| 軸の丸の下端 → カード02の上端 | **15px** |

このタイムラインは**奇数ステップ(01/03)のカードが軸の上側に出る組み**なので、
`.timeline` の上マージン 60px では地図に届いてしまっていた。

### 修正
`.geomap + .timeline{margin-top:77px}`（+17px）。
軸ごと下がるので **02・04 の隙間は変わらず**、01・03 だけが目標の 15px に揃う。

⚠️ `.timeline` は About の「From Japan to the Philippines」でも使っている共有クラス。
そちらは地図が無く上に余白を足す必要がないので、**`.geomap` が直前にある場合だけ**に限定した
（隣接兄弟セレクタ）。About 側は 60px のまま変わらないことを実機で確認済み。

### 確認
適用後の実測: **01=15px / 02=15px / 03=15px / 04=15px**（4つとも一致）。
About のタイムラインは `margin-top:60px` のまま。

## v1.6.5 — 2026-08-11
オーナー指示【HOME】News & Events セクションを About の
「From Japan to the Philippines」と「Experience the freshness for yourself」の間へ移動。

### 構造上の制約と対応
About ページは `page-about.liquid` **1つのセクションに全部入っている**ため、
テンプレートのセクション順を並べ替えても「途中に差し込む」ことができない。
一方で同じマークアップを2箇所に持つのは保守上まずい。

→ **`snippets/news-teaser.liquid` に切り出し**、両方から呼ぶ形にした。
- `sections/index-news.liquid` … スニペットを呼ぶだけに変更（セクション自体は残置。
  設定項目もそのままなので、HOME に戻したくなればテンプレートに追加するだけで復帰できる）
- `sections/page-about.liquid` … `#journey` と CTA帯の間に `{% render 'news-teaser' %}`
- `templates/index.json` … `news` をセクションと order から削除

### 確認（実機）
- HOME: `#news-events` は **0件**、本文に「News & Events」の文字も無し。
  セクション順 hero → arrival → follow → boxes → statement → farmers → howitworks → club → info → faq
- About: **journey(From Japan to the Philippines) → news-events → CTA(Experience the freshness)** の順。
  記事3件がサムネイル付きで正しく描画され、「View all →」も表示。

ℹ️ 副次効果: v1.6.4 で特定した「アライバル帯に被る装飾いちご」は **news セクションのもの**だった。
HOME から news が消えたのでその原因自体も消えたが、z-index の手当ては保険として残してある。

## v1.6.4 — 2026-08-11
オーナー指摘【HOME】アライバル帯の3点。

### 1) いちごが見出しに被る（1024px で再現）
最初は幅1685pxで再現せず、**幅を変えて走査してようやく1024pxで再現**した。
拡大して確認すると「Next Arrival from Japan」の **Ne が真上をいちごに覆われて**いた。

犯人は **`news` セクションの装飾いちご**。`.hero` `.statement` `.page-hero` `.band` `.farmers`
`.shipmap` には `overflow:hidden` があるが **`news` には無く**、いちごが**上方向へはみ出して**
1つ上の帯に乗っていた（要素の座標で確定: 該当点を覆う要素が news の `.berry-orb`）。

**対応**: いちご側は動かさず、`.arrival-strip` に `position:relative;z-index:1` を付けて
**帯を前面に**した。いちごは帯の背面に回るだけで、帯の外では従来どおり見える。
（`news` に `overflow:hidden` を足す案は、他所での見え方まで変えるので採らなかった）

### 2)「Japan」の前で改行 / 3) その下の文章の折り返し
1列目が **202px**（1024px時）しかなく、`Next Arrival from Japan` は**301px**必要だった。
サブテキストも 269px 必要で「week's harvest.」が折り返していた。
`grid-template-columns: 1.1fr 2fr auto` → **`minmax(320px,1.1fr) 2fr auto`**。

### 確認（実機）
| 幅 | 1列目 | 見出し | サブ |
|---|---|---|---|
| 1685px | 320px | 1行 | 1行 |
| 1024px | 320px | 1行 | 1行 |
| 880px | 1列（積み上げ） | 1行 | 1行 |

ボタンは全幅で1行・はみ出しなし。1024px で拡大して、いちごが文字に掛かっていないことも目視確認。

ℹ️ `news` セクションの `overflow` は他にも影響が出うる（別の装飾が隣接セクションへはみ出す）。
今回は指摘箇所のみ対応したので、他でも同様の被りが出たら同じ手当てが要る。

## v1.6.3 — 2026-08-11
オーナー指示「`Our strawberries are grown in Japan, and travel by truck, plane, and van to reach you
at their freshest.` の freshest の前で改行しない」。

### 実測でわかったこと
まず全幅を走査したところ、**どの幅でも `freshest` が行頭に来ることはなかった**。
実際に起きていたのは、2行目が **`their freshest.` の2語だけ**になって垂れ下がる状態。
`text-wrap:pretty` は既に効いているが、Chrome の pretty が回避するのは**1語**の孤立行までで、
2語は対象外だった。

### 原因は文字組みではなく枠の幅（About と同じ型）
- 1行に必要な幅: **794px**
- `.sec-head` の枠: `max-width:42em` = **739px**（55px 足りない）
- 親の `.wrap` は 1136px あり、**この見出しブロックだけが狭かった**

### 修正
`.sec-head{max-width:42em → 46em}`（810px）。**改行そのものが無くなり1行に収まった。**

⚠️ `.sec-head` は全ページのセクション見出しで共有しているため、影響を先に実測した:
- **他の `.sec-head p` は元から全部1行**で、広げても折り返しは変わらない（HOME 5件 / Shop 1件）
- **`.sec-head h2` も全件変化なし**（2行のままの「Special strawberries come / from special farmers.」を含む）

HOME / Farmers / Shop で適用後も再確認し、段落は全件1行・見出しは変化なし。

ℹ️ 810px 未満の画面では当然折り返すが、そこでも `freshest` が行頭に来ないことは走査で確認済み
（340〜860px の10段階）。

## v1.6.2 — 2026-08-11
オーナー指示「他の見出しについて、同様な問題があったところのみ修正」。
**一律に緩めるのではなく、FVと同じ『字形が接触している』箇所だけ**を実測で特定して直した。

### 走査方法
全ページの複数行テキスト（h1〜h4 / .lead / 引用）について、
描画された行を復元 → Canvas の `actualBoundingBoxDescent/Ascent` で
**上の行の降部と下の行の昇部**を測り、行送りから引いた残り＝インクの隙間を算出。
字サイズに対する比率でしきい値を切った（10%未満を「衝突」とみなす）。

### 見つかった衝突（4ルール）
| 対象 | 行間 | 隙間 | 状態 |
|---|---|---|---|
| `.statement h2`（HOME「Grown in Japan.」） | 1.03 | **−4.5px** | **実際に重なっていた** |
| `.dh-info h2`（Farmers「A family-run greenhouse」・インライン） | 1.05 | **−1.8px** | **実際に重なっていた** |
| `.page-hero h1`（About / 記事） | 1.12 | 1.6px | ほぼ接触 |
| `.sec-head h2`（全ページのセクション見出し） | 1.14 | 2.7px | ほぼ接触 |

いずれも **1.22** に統一。修正後の隙間は 6.4〜9.8px（字サイズの13〜14%）。

### 触っていないもの
- `h3`（記事カード等）1.3 → 隙間 4.1px だが**字サイズの21%**で十分。小さい字は比率で見る。
- `.as-title` 1.6 / `.lead` 1.7 → 51〜77%。問題なし。
- FV の `h1.rise` は v1.6.1 で 1.24 に済み（15%）。

### 確認
修正後に全ページを再走査し、**衝突 0 件**。サイト全体の最小は 4.1px / 21%（h3）。
`.statement`（1.03→1.22 と最大の変更）と Farmers の農家見出しは目視でも確認済み。

ℹ️ Farmers の「A family-／run greenhouse」はハイフン位置で折れているが、
これは英文組版として正常（v1.5.8 で判断済み）。重なりが解消して可読になった。

## v1.6.1 — 2026-08-11
オーナー指示【HOME】「FVの文言含め行間をもう少しだけ空けたい。strawberries の i と Japanese の J の
間隔が狭すぎる。行間が狭いとラグジャリー感が薄まる」。

### 感覚ではなく字形のインク量を測った
Canvas の `actualBoundingBoxAscent/Descent` で**実際の字形の隙間**を算出（行送りから
上の行の降部と下の行の昇部を引く）。指摘のペアだけが突出して狭かった:

| 行の組 | 修正前のインク隙間 |
|---|---|
| **Japanese → strawberries,** | **0.7px**（ほぼ接触） |
| Premium → Japanese | 20.8px |
| delivered fresh → to the | 16.9px |

Libre Baskerville は **J の降部が深く**（16.9px）、次行の b/t の昇部が高い（54px）。
font-size 65.1px に対し行送り 71.6px（1.1）なので、合計 70.9px を引くと 0.7px しか残らない。
**特定の文字の組み合わせでだけ起きる衝突**で、他の行は問題なかった。

### 変更
| | 前 | 後 | 効果 |
|---|---|---|---|
| `.hero h1` の行間 | 1.1 | **1.24** | インク隙間 0.7px → **9.8px** |
| `.hero p.lead` の行間 | 1.6（継承） | **1.7** | 12.5px → 14.3px |
| `.hero` の上余白 | 62px | **48px** | 下記の折り返し対策 |

⚠️ **上余白を詰めた理由**: 行間だけ広げると CTA の下端が 865px となり、
画面高 866px に対し**余裕1px**（少しでも短い画面ではボタンが折り返し以下に落ちる）。
上余白を 48px にして **CTA下端 851px・余裕15px** を確保した。見出しの開始位置は 14px 上がるだけで、
行間が広がったぶん FV 全体はむしろゆとりが増えている。

### 確認
- デスクトップ（1685×1009）: インク隙間 9.8px、CTA 余裕 15px。目視確認済み。
- モバイル（500px）: 見出し 40.5px / 行送り 50.2px、インク隙間 6.1px、はみ出しなし。
- 1.20 / 1.24 / 1.28 の3案を実機でレンダリングして比較したうえで 1.24 を採用（1.28 は CTA が画面外）。

ℹ️ 他の見出し（`.statement h2` 1.03、`.sec-head h2` 1.14、`.page-hero h1` 1.12）も詰まっているが、
指摘は HOME の FV だったため今回は触っていない。同じ処置を広げるかは要判断。

## v1.6.0 — 2026-08-11
オーナー指示「全ページで多用されている em ダッシュ（—）を減らし、別の語法にしたい。AIの癖なので」。

### 範囲と結果
| 対象 | 修正前 | 修正後 |
|---|---|---|
| テーマ（本文・スキーマ既定値） | 94 | **2**（コード内コメントのみ） |
| テンプレートJSON（保存済み設定） | 10 | 0 |
| 商品説明（8商品） | 12 | 0 |
| ブログ記事（4本） | 28 | 0 |
| **本文合計** | **約135** | **顧客に見えるのは 7 箇所のみ** |

### やり方
機械的な一括置換はしていない。**全94箇所に通し番号を振り、1件ずつ置換文字を指定**した。
規則ベースの初案はコンマ・スプライス（`No minimum, reserve a single box`）を10件ほど作ったため破棄。

使い分け:
- **同格・言い換えが続く** → コロン。`the exact delivery window: typically 1–2 days…`
- **接続詞が続く** → カンマ。`grown in Japan, and travel by truck…`
- **独立した節が続く** → 文を切って大文字化。`No minimum. Reserve a single box…` / `Yes. You'll receive…`
- **ラベルの対** → 中黒。`Farm A · Berry Farm`（サイト既存の `Farm A · Chiba, Japan` に合わせた）
- **挟み込みの2本組** → 両方カンマ。`breeding programs, often run by prefectural research stations, chase…`

**語は1つも変えていない。句読点と接続だけ。**

### 意図的に残した7箇所
- 引用の署名 `— our grower, Farm A`（3件）: 英文組版の標準。ダッシュが正しい用法。
- 購入オプションの区切り `One-time purchase — ₱4,800.00`（2件）: UIの区切りで散文ではない。
- **商品名** `Farm B — Seasonal Box` / `Ichigo Club — 3-Month Prepaid`（2件）:
  商品名の変更は文言修正ではなくデータ変更なので独断で行わない。要否は要判断。

### 後片付け
v1.5.8 で入れたダッシュ糊付けフィルタ（`replace: ' — ', ' —\u00A0'`）は対象が消えたため4箇所とも撤去。
ベタ書きに入れた U+00A0 も本文からは消滅（残るのはコード内コメント1件のみ）。

### ⚠️ 取りこぼしの原因（記録）
除外条件を**行単位**で書いたため、引用の署名（`— our grower`）と同じ行にあった
**引用文中のダッシュ1件を巻き添えで除外**していた。実機スキャンで発見して修正。
除外はダッシュ単位で判定すべきだった。

## v1.5.10 — 2026-08-11
クライアント指摘【文言削除】。Farmers ページ「We partner with only two growers」直下の説明文を削除。

> So we can tell their full story, uphold strict quality standards, and put their name on
> every box delivered to the Philippines. Tap a farm to read its story.

`sections/page-farmers.liquid` の `.sec-head` 内 `<p>` を削除（ベタ書きのマークアップ）。
アイキャッチ「WHY EACH FARM MATTERS」と見出しは残し、そのまま農家カードへ続く。
実機で消えたことと、見出しブロックの体裁が崩れていないことを確認。

⚠️ 削除した文には「put their name on every box」（全箱に生産者名を記載）という**運用上の約束**が
含まれていた。同種の約束が他ページに残っていないかは未確認 — 必要なら洗い出す。

## v1.5.9 — 2026-08-11
クライアント指摘「モバイルで How can we help の help がいちごのアイコンに被って見えない」。

### 原因は重なり順ではなく **CSS の !important による塗りつぶし**
最初に疑ったのは z-index（いちごが文字の上に乗っている）だが、実機で調べると
`.berry-orb` は **z-index:0**、見出しを含む `.wrap` は **z-index:2** で、テキストは正しく上にある。
`elementsFromPoint` でも最前面は `span.r`。**被っていたのは色**だった —
「help?」だけ `--red` で、真っ赤ないちごの上に赤文字が乗って消えていた。

**なぜ真っ赤だったか**: `.berry-orb` は各セクションが `style="opacity:.45"` のように
**インラインで濃さを指定**している（CSS 517行目のコメントにも「set per-section opacity inline」と明記）。
ところが 513行目の `opacity:1!important` がそれを全部無効化しており、
**サイト上の装飾いちご6個すべて**（.4／.45／.5／.5／.55／.85 の指定）が **1.0 のベタ塗り**になっていた。

### 修正
`opacity:1!important` を撤去。インラインの指定が本来どおり効くようになった。

| セクション | 指定 | 修正前 | 修正後 |
|---|---|---|---|
| page-hero（Help/About/Shop） | .45 | 1.0 | **0.45** |
| hero / statement | .5 | 1.0 | **0.5** |
| band | .55 | 1.0 | **0.55** |
| news | .4 | 1.0 | **0.4** |
| farmers | .85 | 1.0 | **0.85** |

### 確認
- Help ページ（606px 幅）で「help?」が完全に読めることを実機で目視確認。
- ホーム（1685px）の hero と farmers セクションも確認。装飾は意図どおりの濃さになり、
  暗い背景の farmers（.85）は従来どおり存在感を保っている。
- ⚠️ macOS Chrome はウィンドウ幅 500px 未満にできないため **実測は 606px まで**。
  今回の修正は不透明度が原因なので幅に依存しないが、実機スマホでの最終確認は依頼済み。

## v1.5.8 — 2026-08-11
オーナー「他のページも確認して、同様に変な改行ないか確認して直して」。
実ブラウザで**全ページを機械走査**（段落・見出し・リストの実描画行を復元し、行末の機能語／
ダッシュ／ハイフン分割／孤立語／容器との幅ずれを検出）。

### 直したもの
- **幅ずれ（About と同じ型）**: `.statement p{max-width:28em}` を撤去。見出しは 624px いっぱいなのに
  段落だけ 517px で、段落だけ早く折れていた。**サイト全体で幅ずれ 0 件**になった。
- **商品説明のハイフン分割**: `product.description` と農家テキストの出力に
  ダッシュ糊付けフィルタを追加（原稿は汚さず、描画時にだけ適用）。Shop ページの
  「1行目末がダッシュ」は解消。
- **見出しの孤立語**: `h2,h3,h4{text-wrap:balance}`。短い見出し＝balance の本来の用途。
  本文には掛けない（折る位置を保証しないため。v1.5.5 で実証済み）。

### あえて直していないもの（判断）
- **ハイフン語が行をまたぐ**（`third-`/`generation`、`quality-`/`inspected.`）:
  英文でハイフン位置で折るのは**本来正しい組版**。U+2011 で止めることは可能だが、
  勝手に全部止めると意図した分割まで潰す。要望があれば個別に対応する。
- **狭いカラムで行末が the / and / for / at になる**: 200〜300px 幅の3カラムカードでは
  避けられない通常の rag。`text-wrap:pretty` は既に効いている。
- **hero の h1 と statement の h2 が3行になり最終行が短い**: balance 適用済みで、
  それでもこの分割になる（表示用の大見出しとして成立している）。

### 検出器の誤検出も記録
`/pages/farmers` の 546px 段落は `.two-col`（意図的な2段組み）。幅ずれではないので触っていない。
**検出結果をそのまま直さないこと** — 何が意図的かは実物を見ないと分からない。

## v1.5.7 — 2026-08-11
オーナー「わざと折り返さなくてもいい。ボーダーをFITにして画面に合わせて自動改行にして」。

### 本当の原因は折り返しではなく**幅**だった
実測: 見出しの罫線 **1136px** / カード列 **1136px** / **段落だけ 915px**（`max-width:52em`）。
段落だけが手前で切れていたので、**どこで折れても「早すぎる」ように見えていた**。
v1.5.4〜v1.5.6 は3回とも「どこで折るか」を調整していたが、直すべきは器のほうだった。

### 変更
- 段落の `max-width:52em` を撤去 → 親（`.wrap` の内容幅）に一致。右端が罫線・カードと揃う。
- `<br class="lb">` と CSS の `.lede .lb` を撤去 → **強制改行ゼロ、完全な自動折り返し**。
- 折ってはいけない箇所の糊だけ残した（改行を強制するものではない）:
  U+2011 = `cold‑chain` / `grey‑market` の分割防止、
  U+00A0 = `is traceable,` / `and accountable,`（行末が機能語になるのを防ぐ）。

### 実機で確認（Chrome / 実ストア）
| 幅 | 段落幅 = カード幅 | 折り返し |
|---|---|---|
| 1685px | 1136 = 1136 ✅ | `…you is traceable, compliant,` / `and accountable, not grey‑market.` |
| 500px | 460 = 460 ✅ | `…sourcing,` / `customs, cold‑chain, and delivery — so what reaches` / `you is traceable, compliant, and accountable,` / `not grey‑market.` |

強制改行 0 / 行末に機能語・ダッシュ・割れたハイフンなし。スクリーンショットでも確認済み。

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
