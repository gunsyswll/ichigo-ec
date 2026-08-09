# Sheets ⇄ Shopify 在庫同期 — 実装仕様 v1

作成 2026-08-09 (Fable) · オーナー承認済みの設計判断にもとづく · 実装は Google Apps Script

## 0. 決定事項（変更するな）

| 項目 | 決定 | 理由 |
|---|---|---|
| 結合キー | **SKU**（`ICH-001`〜、不変） | 商品名も農家も変わり得る |
| 農家の紐付け | **Shopify の `vendor`（販売元）** | 農家追加＝vendor入力のみ、設定作業ゼロ |
| SKUに農家コード | **埋めない** | 季節で供給元が変わる＝不変キーが嘘になる |
| 在庫の書き込み | **`inventoryAdjustQuantities`（差分加算）のみ** | 絶対値上書きは売れた分を消す＝売り越し |
| ファイル分離 | **農家ごとに別スプレッドシート** | Sheetsのシート保護は「編集」制御であって閲覧を隠せない |
| 農家ファイルの読み方 | Apps Script の `openById` | IMPORTRANGE は手動許可・遅延・行数上限 |
| ロケーション | 単一（現状1つ）。GIDは起動時に解決してキャッシュ | 1商品=1農家なので分割不要 |
| API | Admin GraphQL **2025-01** | `compareQuantity` 系の変更に触れない差分方式 |

**禁止**: `inventorySetQuantities` / `inventorySetOnHandQuantities` は使わない。絶対値を書く経路をコードに一切作らない。

## 1. ファイル構成

すべて**当方のGoogleアカウント所有**。農家には該当ファイルの編集権のみを共有する。

### マスター（1ファイル・農家には共有しない）
- シート `Products`（**自動生成・手動編集禁止**）
  `A:SKU | B:商品名 | C:販売元 | D:Shopify在庫 | E:最終同期 | F:状態`
- シート `Log`（追記のみ）
  `A:日時 | B:SKU | C:delta | D:結果 | E:農家ファイル | F:行 | G:詳細`
- シート `Config`
  `農家名(vendor) | スプレッドシートID` の対応表。**ここに1行足すだけで農家を追加できること。**

### 農家ファイル（農家ごとに1つ）
- シート `入荷入力`（農家が編集する唯一の場所）
  `A:日付 | B:SKU | C:入荷数 | D:メモ | E:処理状態(自動) | F:処理日時(自動)`
  - E/F列は**スクリプトだけが書く**。保護をかける。
  - 入荷数は**負数も許可**（入力ミスの訂正用）。
- シート `商品一覧`（自動生成・保護）
  その農家の vendor に属する SKU / 商品名 / 現在庫。農家が自分のSKUを確認するため。

## 2. スクリプト（マスターにバインド）

### 認証
Script Properties に `SHOPIFY_STORE` / `SHOPIFY_CLIENTID` / `SHOPIFY_SECRET`。
**毎回 client_credentials でトークンを取得**（`POST /admin/oauth/access_token`）。
トークンをシートやログに書かない。プロパティにも永続化しない。

### 関数
1. `syncProductsFromShopify()`
   全商品＋バリアント（sku, inventoryQuantity, inventoryItem.id, product.vendor）を取得（ページング必須）。
   `Products` を全面更新 → `Config` の各農家ファイルの `商品一覧` を vendor でフィルタして更新。
2. `pushPendingAdjustments()` ← 本体
3. `runSync()` — 10分の時間主導トリガー。`pushPendingAdjustments()` → `syncProductsFromShopify()` の順。

### `pushPendingAdjustments()` の正確な手順
```
lock = LockService.getScriptLock(); lock.tryLock(30000) が false なら即 return   // finally で解放
locationGid = 解決してキャッシュ
Config の各農家について:
  openById → 入荷入力 の全行を読む
  未処理行 = E列が空 かつ B列(SKU)が非空 かつ C列(入荷数)が数値かつ != 0
    ※ 行番号や行数に依存しないこと（農家が並べ替え・行削除しても壊れない）
  各未処理行について:
    inventoryItemId = SKU から解決（CacheService 6h、無ければ productVariants(query:"sku:...") で1件引き）
      → 0件 or 2件以上なら E="ERR SKU未解決" にして次の行へ（APIは呼ばない）
    E列に "SENDING <uuid>" を書き、SpreadsheetApp.flush() で確定    ← APIを呼ぶ前に必ず
    inventoryAdjustQuantities(name:"available", reason:"received",
        changes:[{inventoryItemId, locationId, delta}]) を実行
    成功 → E="OK <adjustmentGroupId>", F=now
    失敗 → E="ERR <message>", F=now, Log に記録
  Log に1行ずつ追記
```

**なぜ SENDING を先に書くのか（最重要・削るな）**
API送信中にスクリプトが落ちると、E列が空のままなら次回**同じ入荷が二重に加算**され、しかも誰も気づかない。
先に SENDING を確定させておけば、落ちた行は SENDING のまま残り**再送されない**。
結果は「加算漏れ（目視で分かる）」であって「二重加算（見えない）」ではない。
SENDING 行は自動で再処理しないこと。`Log` と管理者通知で人間に上げる。

### エラー処理
- `ERR` 行は次回も再処理しない（E列が空でないため）。人間が E列を消せば再試行になる。
- 失敗が発生したら `Log` に記録し、`MailApp` で管理者に通知。**通知は1時間に1通まで**（Properties にタイムスタンプ）。
- HTTP 429 / 5xx は指数バックオフで最大3回まで再試行。それ以外は即エラー扱い。
- GraphQL は HTTP 200 でも `userErrors` / `errors` が入る。**必ず両方を見る**（200＝成功と見なさない）。

## 3. 受け入れテスト（これが通るまで完成としない）

| # | 手順 | 期待 |
|---|---|---|
| T1 | 農家Aファイルに `ICH-005 / +5` を追記 → `pushPendingAdjustments()` | Shopify在庫 15→20、E列 `OK ...` |
| T2 | 同じ関数をもう一度実行 | **在庫が20のまま**（同じ行を再処理しない） |
| T3 | テスト注文を1件通す（在庫20→19）→ 再同期 | **19のまま**。20に巻き戻らない ← 売り越し防止の本番テスト |
| T4 | `ICH-005 / -5` を追記 → 実行 | 19→14（訂正が効く） |
| T5 | 存在しないSKU `ZZZ-999 / +3` | `ERR SKU未解決`、**APIは呼ばれない**、他の行は正常処理 |
| T6 | 農家Aの行を並べ替え・途中行を削除してから実行 | 未処理行だけが正しく処理される |
| T7 | 農家Aのファイルから農家Bの在庫が見えないこと | 別ファイルなので構造的にOK（目視確認） |
| T8 | `Config` に農家Cを1行追加 | コード変更なしで農家Cが処理対象になる |

T3 は**必ず実注文で**行う。手動で在庫を減らしても同じには見えるが、注文経路を通っていない。

## 4. スコープ外（v1ではやらない）
- 複数ロケーション（1商品を複数農家が供給する場合。必要になったら Location 分割）
- 農家別の売上集計（注文APIから作れるが別機能）
- Shopify → シートへの在庫リアルタイム反映（`Products` の10分更新で足りる）
