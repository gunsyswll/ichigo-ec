/**
 * ichigo — Google Sheets ⇄ Shopify 在庫同期 (v1)
 *
 * 仕様: docs/sheets-inventory-sync-spec.md
 * 生成: ローカル fleet (`brain` = fable-distill) 2026-08-09 / QA・修正指示・監査: Fable
 *
 * 設置手順:
 *   1. マスターのスプレッドシートで 拡張機能 → Apps Script を開き、このファイルを貼る
 *   2. プロジェクトの設定 → スクリプト プロパティ に以下を登録
 *        SHOPIFY_STORE     … 例 xxxx.myshopify.com （.myshopify.com まで含める）
 *        SHOPIFY_CLIENTID  … カスタムアプリの Client ID
 *        SHOPIFY_SECRET    … カスタムアプリの Client secret
 *        ADMIN_EMAIL       … エラー通知の宛先
 *   3. installTrigger() を1回実行（10分ごとの runSync トリガーを作る）
 *
 * 設計上の不変条件 — 変更するときはここを読むこと:
 *   - 在庫は差分加算 (inventoryAdjustQuantities) のみ。絶対値を書く経路を作らないこと。
 *     inventorySetQuantities を足した瞬間、売れた分を消して売り越しが起きる。
 *   - API送信の前に列Eへ "SENDING <uuid>" を書いて flush する。途中で落ちた行が再送されず
 *     「加算漏れ（見える）」で止まるための仕掛け。二重加算は見えないので必ずこちらに倒す。
 *   - 列Eが空でない行は絶対に再処理しない。人間が列Eを消したときだけ再試行になる。
 *   - ロックは pushPendingAdjustments の1箇所だけ。Apps Script のロックは再入不可なので、
 *     呼び出し元でも取ると内側が黙って何もせず終わる。
 */

/* ---------- Configuration ---------- */
const CONFIG = {
  SHOPIFY_STORE: PropertiesService.getScriptProperties().getProperty('SHOPIFY_STORE'), // e.g. myshop.myshopify.com
  SHOPIFY_CLIENTID: PropertiesService.getScriptProperties().getProperty('SHOPIFY_CLIENTID'),
  SHOPIFY_SECRET: PropertiesService.getScriptProperties().getProperty('SHOPIFY_SECRET'),
  ADMIN_EMAIL: PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL')
};
const CLEAN_STORE_HOST = (CONFIG.SHOPIFY_STORE || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const SHOPIFY_ENDPOINT = `https://${CLEAN_STORE_HOST}/admin/api/2025-01/graphql.json`;
const TOKEN_ENDPOINT = `https://${CLEAN_STORE_HOST}/admin/oauth/access_token`;

const TOKEN_TTL_MS = 4 * 60 * 1000; // cache token ~4min
const CACHE_SKU_TTL = 6 * 60 * 60; // seconds (6h)
const NOTIF_INTERVAL_MS = 60 * 60 * 1000; // 1 hour


/**
 * Config の [vendor, fileId] 行を返す。ヘッダしか無い/空でも [] を返す。
 * Fable QA fix: getRange(..., 0, ...) は Apps Script で例外になる。Config がまだ空の
 * 初回起動でのみ踏むので、テストで最も見落とされる経路。
 */
function readConfigRows(configSheet) {
  if (!configSheet) return [];
  const lastRow = configSheet.getLastRow();
  if (lastRow < 2) return [];
  return configSheet.getRange(2, 1, lastRow - 1, 2).getValues();
}

/* ---------- Helper Functions ---------- */

/**
 * Retrieves a new client credentials token.
 */
function getShopifyAccessToken() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('SHOPIFY_ACCESS_TOKEN');
  if (cached) return cached;
  const payload = {
    client_id: CONFIG.SHOPIFY_CLIENTID,
    client_secret: CONFIG.SHOPIFY_SECRET,
    grant_type: 'client_credentials'
  };
  const opts = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  const resp = UrlFetchApp.fetch(TOKEN_ENDPOINT, opts);
  const data = JSON.parse(resp.getContentText());
  if (!data.access_token) throw new Error('Failed to obtain Shopify token');
  cache.put('SHOPIFY_ACCESS_TOKEN', data.access_token, TOKEN_TTL_MS / 1000);
  return data.access_token;
}

/**
 * Executes a GraphQL query/mutation with retry on HTTP429/5xx.
 */
function shopifyGraphql(query, variables) {
  const token = getShopifyAccessToken();
  const makeRequest = () => ({
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Shopify-Access-Token': token },
    payload: JSON.stringify({ query, variables }),
    muteHttpExceptions: true
  });
  let attempts = 0;
  const maxAttempts = 3;
  while (true) {
    attempts++;
    const resp = UrlFetchApp.fetch(SHOPIFY_ENDPOINT, makeRequest());
    const code = resp.getResponseCode();
    if (code === 429 || (code >= 500 && code < 600)) {
      if (attempts >= maxAttempts) throw new Error(`Shopify request failed after ${maxAttempts} attempts: ${code}`);
      Utilities.sleep(Math.pow(2, attempts) * 1000); // exponential backoff
      continue;
    }
    const body = JSON.parse(resp.getContentText());
    if (code !== 200) throw new Error(`Shopify HTTP error ${code}`);
    // GraphQL errors may be in 'errors' field
    if (body.errors && body.errors.length) throw new Error(`Shopify GraphQL errors: ${JSON.stringify(body.errors)}`);
    return body;
  }
}

/**
 * Resolves inventoryItemId for a SKU, caches 6h.
 * Returns {invItemId: string|null, count: number}
 */
function resolveInventoryItemInfo(sku) {
  const cache = CacheService.getScriptCache();
  const key = `skuInfo:${sku}`;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const query = `
    query($query: String!) {
      productVariants(first: 10, query: $query) {
        edges { node { sku inventoryItem { id } } }
      }
    }`;
  // SKUに空白や記号が入っても検索式が壊れないよう引用する
  const vars = { query: "sku:'" + String(sku).replace(/'/g, "\\'") + "'" };
  const resp = shopifyGraphql(query, vars);
  const edges = resp.data.productVariants.edges;
  const count = edges.length;
  let invItemId = null;
  if (count === 1) invItemId = edges[0].node.inventoryItem.id;
  const result = {invItemId, count};
  // Fable QA fix: cache ONLY successful resolutions. Caching a 0-hit for 6h means a SKU that is
  // created in Shopify a minute later keeps failing for the rest of the window, and the farmer's
  // retry looks broken for no visible reason. Failures must re-query every time.
  if (count === 1) cache.put(key, JSON.stringify(result), CACHE_SKU_TTL);
  return result;
}

/**
 * Appends a line to the Log sheet.
 */
function appendLogRow({sku, delta, result, farmFileId, rowNum, detail}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Log');
  // Fable QA fix: Log が無いと catch の中から呼ばれたときに二次例外になり、元のエラーが消える
  if (!logSheet) return;
  const nowISO = new Date().toISOString();
  logSheet.appendRow([nowISO, sku, delta, result, farmFileId, rowNum, detail]);
}

/**
 * Sends admin email notification (max 1 per hour).
 */
function notifyAdmin(message) {
  const prop = PropertiesService.getScriptProperties();
  // Fable QA fix 2026-08-11: ADMIN_EMAIL が未設定なら **送らずに Log へ残す**。
  // 従来は MailApp.sendEmail(null, ...) が例外になり、呼び出し元（reportStuckSending や
  // 各エラー経路）ごと実行が落ちていた。「通知できない」ことが「同期が止まる」に化けるのは
  // 最悪の壊れ方。Ops.gs の dailyHealthCheck は既にこの規則で書かれており、そちらに揃える。
  const to = prop.getProperty('ADMIN_EMAIL');
  if (!to) {
    appendLogRow({sku: '', delta: '', result: 'WARN ADMIN_EMAIL 未設定',
      farmFileId: '', rowNum: '', detail: 'notify skipped: ' + message});
    return;
  }
  const lastTs = Number(prop.getProperty('LAST_NOTIFICATION_TS') || '0');
  const now = Date.now();
  if (now - lastTs < NOTIF_INTERVAL_MS) return; // suppress
  MailApp.sendEmail(to, 'Shopify Sync Alert', message);
  prop.setProperty('LAST_NOTIFICATION_TS', now.toString());
}

/**
 * Retrieves location GID (cached).
 */
function getLocationGid() {
  const prop = PropertiesService.getScriptProperties();
  let gid = prop.getProperty('LOCATION_GID');
  if (gid) return gid;
  const query = `
    query {
      locations(first:1) { edges { node { id } } }
    }`;
  const resp = shopifyGraphql(query, {});
  gid = resp.data.locations.edges[0].node.id;
  prop.setProperty('LOCATION_GID', gid);
  return gid;
}

/**
 * Scans all farms for rows whose column E starts with "SENDING ".
 * Appends them to master Log sheet and notifies admin once.
 */
function reportStuckSending() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('Config');
  const cfgRows = readConfigRows(configSheet); // [vendor, fileId]
  const stuckEntries = [];
  cfgRows.forEach(([ , fileId]) => {
    const farmSS = SpreadsheetApp.openById(fileId);
    const inputSheet = farmSS.getSheetByName('入荷入力');
    const lastRow = inputSheet.getLastRow();
    if (lastRow < 2) return;
    const width = Math.min(6, inputSheet.getLastColumn());
    const dataRange = inputSheet.getRange(2, 1, lastRow - 1, width);
    const rows = dataRange.getValues();
    rows.forEach((row, idx) => {
      while (row.length < 6) row.push('');
      const stateColE = row[4];
      if (typeof stateColE === 'string' && stateColE.startsWith('SENDING ')) {
        const sku = row[1];
        const deltaRaw = row[2];
        const delta = Number(deltaRaw);
        const rowNumber = idx + 2;
        stuckEntries.push({sku, delta, result: stateColE, farmFileId: fileId, rowNum: rowNumber});
      }
    });
  });
  if (stuckEntries.length) {
    stuckEntries.forEach(entry => {
      appendLogRow({sku: entry.sku, delta: entry.delta, result: entry.result,
        farmFileId: entry.farmFileId, rowNum: entry.rowNum, detail: 'stuck SENDING'});
      // Fable QA fix: flip SENDING -> STUCK after logging it ONCE. Without this the same stuck row
      // is re-logged on every 10-minute run forever and the Log sheet becomes unreadable.
      // STUCK is still a non-empty column E, so the row is still never auto-retried — which is the
      // whole point of the SENDING marker. A human clears column E to retry.
      SpreadsheetApp.openById(entry.farmFileId).getSheetByName('入荷入力')
        .getRange(entry.rowNum, 5).setValue(entry.result.replace(/^SENDING /, 'STUCK '));
    });
    SpreadsheetApp.flush();
    notifyAdmin(`Shopify sync detected ${stuckEntries.length} stuck "SENDING" rows. See Log sheet.`);
  }
}

/* ---------- Core Sync Functions ---------- */

/**
 * syncProductsFromShopify()
 * Fetches all products & variants, updates master Products sheet,
 * then updates each farm's 商品一覧 sheet filtered by vendor.
 */
function syncProductsFromShopify() {
  // Fable QA fix 2026-08-10: ロックを取る。runSync が10分以内に終わらないと2本が重なり、
  // 下の clearContents と setValues が交錯して Products が壊れうる。
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prodSheet = ss.getSheetByName('Products');
  // ⚠️ ここでシートを消さないこと。取得に失敗した場合、マスターが空のまま残る。
  // しかも Products が空だと鮮度監視の H1 が判定材料を失い「OK」を返してしまう
  // （破壊的な失敗を監視が見逃す最悪の組み合わせ）。取得が全部成功してから書く。
  const allRows = [];
  let cursor = null;
  do {
    const query = `
      query($cursor: String) {
        products(first:100, after:$cursor) {
          edges { node {
            title
            vendor
            variants(first:100) {
              edges { node {
                sku
                inventoryQuantity
                inventoryItem { id }
              } }
            }
          } }
          pageInfo { hasNextPage endCursor }
        }
      }`;
    const vars = { cursor };
    const resp = shopifyGraphql(query, vars);
    const edges = resp.data.products.edges;
    for (const edge of edges) {
      const prod = edge.node;
      const variantEdges = prod.variants.edges;
      for (const ve of variantEdges) {
        const v = ve.node;
        allRows.push([v.sku, prod.title, prod.vendor, v.inventoryQuantity,
          new Date().toISOString(), 'synced']);
      }
    }
    cursor = resp.data.products.pageInfo.hasNextPage ? resp.data.products.pageInfo.endCursor : null;
  } while (cursor);
  // ---- ここまで来た＝Shopifyからの取得が全ページ成功。ここで初めてシートを書き換える ----
  prodSheet.clearContents();
  prodSheet.appendRow(['SKU', '商品名', '販売元', 'Shopify在庫', '最終同期', '状態']);
  if (allRows.length) prodSheet.getRange(2, 1, allRows.length, allRows[0].length).setValues(allRows);
  // Update each farm's 商品一覧 sheet
  const configSheet = ss.getSheetByName('Config');
  const cfgData = readConfigRows(configSheet);
  cfgData.forEach(([vendor, fileId]) => {
    const farmSS = SpreadsheetApp.openById(fileId);
    const listSheet = farmSS.getSheetByName('商品一覧');
    // Clear and write filtered rows
    listSheet.clearContents();
    const filtered = allRows.filter(row => row[2] === vendor);
    // Always write header
    listSheet.appendRow(['SKU', '商品名', '現在庫']);
    if (filtered.length) {
      listSheet.getRange(2, 1, filtered.length, 3).setValues(filtered.map(r => [r[0], r[1], r[3]]));
    }
    // Fable QA fix 2026-08-11: 商品名が既定幅で切れて農家がSKUと商品を突き合わせられなかった。
    // 手で広げても setValues のたびに元へ戻る類ではないが、農家ファイルが増えたときに
    // 設定し忘れるので、書き込みと同じ場所で毎回そろえる。
    listSheet.setColumnWidth(1, 110);  // SKU
    listSheet.setColumnWidth(2, 280);  // 商品名
    listSheet.setColumnWidth(3, 90);   // 現在庫
  });
  } finally {
    lock.releaseLock();
  }
}

/**
 * pushPendingAdjustments()
 * Processes each farm's 入荷入力 sheet pending rows.
 */
function pushPendingAdjustments() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return; // exit if lock not obtained
  try {
    const locationId = getLocationGid();
    const ss = SpreadsheetApp.getActiveSpreadsheet(); // master
    const configSheet = ss.getSheetByName('Config');
    const cfgRows = readConfigRows(configSheet); // [vendor, fileId]
    cfgRows.forEach(([ , fileId]) => {
      const farmSS = SpreadsheetApp.openById(fileId);
      const inputSheet = farmSS.getSheetByName('入荷入力');
      const lastRow = inputSheet.getLastRow();
      if (lastRow < 2) return; // no data
      const width = Math.min(6, inputSheet.getLastColumn());
      const dataRange = inputSheet.getRange(2, 1, lastRow - 1, width);
      const rows = dataRange.getValues(); // A:F (or fewer columns)
      rows.forEach((row, idx) => {
        while (row.length < 6) row.push('');
        const [date, sku, deltaRaw, memo, stateColE, timestampF] = row;
        // Determine pending rows
        const delta = Number(deltaRaw);
        if (stateColE) return;              // 既に処理済み/エラー/保留 — 絶対に触らない
        if (!sku) return;                    // SKU未入力の行は行ごと未使用とみなす
        // Fable QA fix 2026-08-10: 入荷数が空欄または0の行を「黙って飛ばす」と、列Eが空のまま
        // 永久に残り、鮮度監視が永続ALERTを出し続ける（実測。農家が数量を書き忘れる想定は現実的）。
        // 飛ばさずに理由を列Eへ書いて、農家自身の画面で気づけるようにする。
        // 直し方は「数量を入れて列Eを消す」— 他のエラー行と同じ手順。
        if (isNaN(delta) || delta === 0) {
          inputSheet.getRange(idx + 2, 5).setValue('ERR 入荷数が未入力または0');
          SpreadsheetApp.flush();
          appendLogRow({sku: sku, delta: deltaRaw, result: 'ERR 入荷数が未入力または0',
            farmFileId: fileId, rowNum: idx + 2, detail: 'zero-or-blank quantity'});
          return;
        }
        const rowNumber = idx + 2; // actual sheet row
        // Resolve inventoryItemId with qualified SKU query
        const {invItemId, count} = resolveInventoryItemInfo(sku);
        if (count === 0) {
          inputSheet.getRange(rowNumber, 5).setValue('ERR SKU未解決(0件)');
          SpreadsheetApp.flush();
          appendLogRow({sku, delta, result: 'ERR SKU未解決(0件)', farmFileId: fileId,
            rowNum: rowNumber, detail: 'no inventory item'});
          return;
        }
        if (count > 1) {
          inputSheet.getRange(rowNumber, 5).setValue(`ERR SKU重複(${count}件)`);
          SpreadsheetApp.flush();
          appendLogRow({sku, delta, result: `ERR SKU重複(${count}件)`, farmFileId: fileId,
            rowNum: rowNumber, detail: 'duplicate variants'});
          return;
        }
        // Write SENDING status BEFORE API call
        const uuid = Utilities.getUuid();
        inputSheet.getRange(rowNumber, 5).setValue(`SENDING ${uuid}`);
        SpreadsheetApp.flush(); // ensure write before network
        // Build mutation (corrected per D4)
        const mutation = `
          mutation($input: InventoryAdjustQuantitiesInput!) {
            inventoryAdjustQuantities(input:$input) {
              inventoryAdjustmentGroup { id }
              userErrors { field message }
            }
          }`;
        const variables = {
          input: {
            name: "available",
            reason: "received",
            changes: [{ inventoryItemId: invItemId, locationId: locationId, delta }]
          }
        };
        try {
          const resp = shopifyGraphql(mutation, variables);
          const adjGroup = resp.data.inventoryAdjustQuantities.inventoryAdjustmentGroup;
          const userErrs = resp.data.inventoryAdjustQuantities.userErrors;
          if (userErrs && userErrs.length) throw new Error(userErrs.map(e => e.message).join('; '));
          const groupId = adjGroup.id;
          inputSheet.getRange(rowNumber, 5).setValue(`OK ${groupId}`);
          inputSheet.getRange(rowNumber, 6).setValue(new Date().toISOString());
          appendLogRow({sku, delta, result: `OK ${groupId}`, farmFileId: fileId,
            rowNum: rowNumber, detail: 'adjusted'});
        } catch (e) {
          const msg = e.message || 'unknown error';
          inputSheet.getRange(rowNumber, 5).setValue(`ERR ${msg}`);
          inputSheet.getRange(rowNumber, 6).setValue(new Date().toISOString());
          appendLogRow({sku, delta, result: `ERR ${msg}`, farmFileId: fileId,
            rowNum: rowNumber, detail: 'adjust failed'});
          notifyAdmin(`Shopify adjustment error (SKU ${sku}): ${msg}`);
        }
      });
    });
    // Report any rows still stuck in "SENDING" state
    reportStuckSending();
  } finally {
    lock.releaseLock();
  }
}

/**
 * runSync()
 * Orchestrates pending adjustments then product sync on a 10‑minute trigger.
 */
function runSync() {
  pushPendingAdjustments();
  syncProductsFromShopify();
}

/**
 * installTrigger()
 * 10分ごとの runSync トリガーを作る。既存の runSync トリガーは重複を避けるため先に削除する。
 * 設置時に1回だけ手動実行すればよい。
 */
function installTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'runSync')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('runSync').timeBased().everyMinutes(10).create();
}
