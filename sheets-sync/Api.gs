/**
 * ichigo — Sheets⇄Shopify 在庫同期: 運用フック (Api.gs)  ※ 未デプロイ
 *
 * 2つの入口を足すファイル。Code.gs / Setup.gs と同じプロジェクトに置く。
 *
 * (A) onOpen メニュー「いちご同期」— 貼るだけで有効。デプロイ不要。
 *     クライアントの日常運用はこれで足りる（エディタを触らせない）。
 *
 * (B) doPost — curl から同期を叩くための Web アプリ。**任意**。
 *     デプロイすると「全員」アクセスのURLが生えるので、有効化はオーナー判断で。
 *     必須条件: スクリプトプロパティ `API_TOKEN` を設定すること。未設定なら全リクエストを拒否する。
 *     トークン比較は定数時間。GET は実装していない（GETで在庫を動かせてはいけない）。
 *     デプロイ設定: 実行ユーザー=自分 / アクセス=全員（curl は Google の OAuth を提示できないため）。
 *
 * ⚠️ 2026-08-09 時点では (B) は未デプロイ。エディタの関数ドロップダウンが自動操作で不安定なため
 *    用意したものだが、公開URLを増やす判断はオーナーのもの。
 */
/**
 * API_TOKEN must be set in Script Properties.
 *
 * Deploy the script as a Web App with:
 *   - Execute the app as: "自分"
 *   - Who has access to the app: "全員"
 *
 * This allows external tools (e.g. curl) to invoke the endpoint without a Google OAuth session.
 */

/**
 * Constant‑time comparison of two strings.
 *
 * Returns true if both strings are equal, false otherwise.
 */
function constantTimeCompare(a, b) {
  // Compare lengths first (still constant‑time: avoid early return)
  var lenA = a.length;
  var lenB = b.length;
  var diffLen = lenA ^ lenB; // non‑zero if lengths differ

  // XOR each character pair up to the max length
  var maxLen = Math.max(lenA, lenB);
  var diffChar = 0;
  for (var i = 0; i < maxLen; i++) {
    var charA = i < lenA ? a.charCodeAt(i) : 0;
    var charB = i < lenB ? b.charCodeAt(i) : 0;
    diffChar |= charA ^ charB;
  }

  // If either length or any character differs, the result is non‑zero
  return (diffLen | diffChar) === 0;
}

/**
 * Web App POST endpoint.
 *
 * Expected JSON body:
 *   {"token":"...","action":"push|sync|full|status"}
 *
 * Returns JSON with shape:
 *   {ok:true, action:"...", result:...}
 * or
 *   {ok:false, error:"..."}
 */
function doPost(e) {
  var result = {};

  try {
    // Parse request JSON
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing request body');
    }
    var payload = JSON.parse(e.postData.contents);
    if (!payload.token || !payload.action) {
      throw new Error('Missing token or action');
    }

    // Retrieve stored token
    var scriptProps = PropertiesService.getScriptProperties();
    var storedToken = scriptProps.getProperty('API_TOKEN') || '';
    if (!storedToken) {
      throw new Error('API token not configured');
    }

    // Constant‑time token validation
    if (!constantTimeCompare(storedToken, payload.token)) {
      throw new Error('Invalid token');
    }

    // Validate action
    var allowed = ['push', 'sync', 'full', 'status'];
    if (allowed.indexOf(payload.action) === -1) {
      throw new Error('Invalid action');
    }

    // Execute action
    var actionResult;
    switch (payload.action) {
      case 'push':
        pushPendingAdjustments();
        actionResult = {message: 'Adjusted pending inventory'};
        break;
      case 'sync':
        syncProductsFromShopify();
        actionResult = {message: 'Sync with Shopify completed'};
        break;
      case 'full':
        runSync();
        actionResult = {message: 'Full sync completed'};
        break;
      case 'status':
        // Gather product sheet rows, guard against header‑only sheets
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var prodSheet = ss.getSheetByName('Products');
        if (!prodSheet) {
          throw new Error('Products sheet not found');
        }
        var prodLastRow = prodSheet.getLastRow();
        var prodData = [];
        if (prodLastRow > 1) {
          prodData = prodSheet.getRange(2, 1, prodLastRow - 1, prodSheet.getLastColumn()).getValues();
        }
        var products = prodData.map(function(row) {
          return {
            sku: row[0],
            title: row[1],
            vendor: row[2],
            qty: row[3]
          };
        });

        // Process each farm file config
        var cfgSheet = ss.getSheetByName('Config');
        if (!cfgSheet) {
          throw new Error('Config sheet not found');
        }
        var configRows = readConfigRows(cfgSheet); // returns array of [vendor, fileId]
        var farmStatus = {};

        configRows.forEach(function(row) {
          var vendor = row[0];
          var fileId = row[1];
          if (!vendor || !fileId) {
            farmStatus[vendor || 'unknown'] = {error: 'Config missing vendor or file ID'};
            return;
          }
          var farmSs = SpreadsheetApp.openById(fileId);
          var sheet = farmSs.getSheetByName('入荷入力');
          if (!sheet) {
            farmStatus[vendor] = {error: 'Sheet missing'};
            return;
          }
          var values = sheet.getDataRange().getValues();

          // Count rows by bucket based on column E (index 4)
          var counts = {pending:0, ok:0, err:0, stuck:0};
          for (var i = 1; i < values.length; i++) { // skip header
            var cellE = (values[i][4] || '').toString();
            if (!cellE) {
              counts.pending++;
            } else if (cellE.startsWith('OK ')) {
              counts.ok++;
            } else if (cellE.startsWith('ERR ')) {
              counts.err++;
            } else if (cellE.startsWith('SENDING ') || cellE.startsWith('STUCK ')) {
              counts.stuck++;
            }
          }
          farmStatus[vendor] = counts;
        });

        actionResult = {
          products: products,
          farmStatus: farmStatus
        };
        break;
    }

    result.ok = true;
    result.action = payload.action;
    result.result = actionResult;
  } catch (err) {
    result.ok = false;
    result.error = err.message || 'Unexpected error';
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Spreadsheet menu creation.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('いちご同期')
    .addItem('今すぐ同期 (入荷を反映)', 'menuPush')
    .addItem('商品一覧を更新', 'menuSync')
    .addItem('農家ファイルのURLを表示', 'showFarmerFileUrls')
    .addToUi();
}

/**
 * Wrapper for pushPendingAdjustments with user feedback.
 */
function menuPush() {
  try {
    pushPendingAdjustments();
    SpreadsheetApp.getActiveSpreadsheet().toast('入荷を反映しました');
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast('エラー: ' + e.message);
  }
}

/**
 * Wrapper for syncProductsFromShopify with user feedback.
 */
function menuSync() {
  try {
    syncProductsFromShopify();
    SpreadsheetApp.getActiveSpreadsheet().toast('商品一覧を更新しました');
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast('エラー: ' + e.message);
  }
}

/**
 * Builds a list of URLs from the Config sheet and displays them in an alert.
 */
function showFarmerFileUrls() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfgSheet = ss.getSheetByName('Config');
  if (!cfgSheet) {
    SpreadsheetApp.getUi().alert('Config sheet not found.');
    return;
  }

  var rows = readConfigRows(cfgSheet); // each row: [vendor, fileId]
  if (!rows || rows.length === 0) {
    SpreadsheetApp.getUi().alert('No farm file URLs found.');
    return;
  }

  // Build labeled URL list
  var lines = rows.map(function(r) {
    var vendor = r[0];
    var fileId = r[1];
    if (!vendor || !fileId) return null;
    var url = 'https://docs.google.com/spreadsheets/d/' + fileId + '/edit';
    return vendor + ': ' + url;
  }).filter(Boolean);

  if (lines.length === 0) {
    SpreadsheetApp.getUi().alert('No URLs present in Config.');
    return;
  }

  // Also log via the existing helper
  if (typeof printFarmerFileUrls === 'function') {
    printFarmerFileUrls();
  }

  SpreadsheetApp.getUi().alert('農家ファイル URL:\n' + lines.join('\n'));
}
