/**
 * ichigo — 運用レイヤ (Ops.gs)
 *
 * 仕様: docs/health-check-spec.md
 * 生成: ローカル fleet (`brain`) 2026-08-10 / QA・修正指示・監査: Fable
 * ※ Api.gs を統合したもの。Api.gs は廃止（同じ内容がこの下半分にある）。
 *
 * 入っているもの:
 *   (A) onOpen メニュー「いちご同期」— 貼るだけで有効。クライアントはエディタを触らなくてよい。
 *   (B) dailyHealthCheck() — 鮮度監視。2時間おきトリガーから呼ぶ。
 *   (C) install*Trigger() — トリガー設置をコード化したもの（ゼロから作り直すとき用）。
 *
 * ⚠️ doPost（ウェブアプリの受け口）は 2026-08-10 に削除した。オーナー判断:
 *    curl から叩ける口は誰も使っておらず、デプロイすると「アクセス=全員」の公開URLから
 *    Shopify在庫を動かせてしまう。トリガーとメニューで同じ用は足りている。復活が要るなら git から。
 *
 * 設計上の不変条件 — 変更するときはここを読むこと:
 *   - 監視は **Shopify API を呼ばない**。Shopifyが落ちている時こそ監視は動かないといけない。
 *   - 監視が見るのは「スケジューラが動いたか」ではなく **成果物が新鮮か**。
 *     2026-08-09、syncProductsFromShopify は「実行完了・エラーなし」と出しながら一度も走って
 *     おらず、Productsは空のままだった。例外は起きない。だから鮮度で見る。
 *   - **異常時のみ通知」にしない**。週1回の正常サマリを必ず送ること。それが無いと
 *     「監視自体が死んだ沈黙」と「正常な沈黙」が区別できない。
 *   - ADMIN_EMAIL が未設定なら **代替の宛先を発明しない**。送らず、Healthシートに未設定と書く。
 */

/**
 * Perform a health check of the farm sync system and log the result.
 * Inserts a new row at the top (row 2) of the "Health" sheet.
 * Sends an email to ADMIN_EMAIL when alert/warn conditions are met,
 * respecting rate‑limit properties.
 */
function dailyHealthCheck() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();

  // ---------- Helper ----------
  function getColumnIndex(sheet, headerName) {
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (let i = 0; i < headerRow.length; i++) {
      if (headerRow[i] === headerName) return i + 1;
    }
    return -1; // not found
  }

  function safeReadRows(sheet, startRow, colIdx) {
    const lastRow = sheet.getLastRow();
    if (lastRow < startRow) return []; // only header present
    const rowCount = lastRow - startRow + 1;
    return sheet.getRange(startRow, colIdx, rowCount, 1).getValues();
  }

  // ---------- Ensure Health sheet ----------
  let healthSheet = ss.getSheetByName('Health');
  if (!healthSheet) {
    healthSheet = ss.insertSheet('Health');
    // Write header row
    const headers = ['日時', '判定', '在庫同期', '販売同期', '未処理', '停止中', 'エラー', '24h処理数', '詳細'];
    healthSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Freeze header row
    healthSheet.setFrozenRows(1);
    // Protect header row (optional; keeps it from accidental edits)
    const protection = healthSheet.getRange('1:1').protect();
    protection.setDescription('Health sheet header');
  }

  // ---------- H1: Inventory sync freshness ----------
  // Fable QA fix 2026-08-10: 既定を「異常」にする。Products が空・シートが無い・最終同期列が読めない —
  // どれも「同期できている証拠が無い」状態であって、OK ではない。既定 true にしていたため、
  // 取得失敗で Products が空になった場合に監視が OK を返す穴があった。
  let h1Fresh = false;
  const productsSheet = ss.getSheetByName('Products');
  if (productsSheet) {
    const syncColIdx = getColumnIndex(productsSheet, '最終同期');
    if (syncColIdx > 0) {
      const syncValues = safeReadRows(productsSheet, 2, syncColIdx);
      let maxSyncDate = null;
      syncValues.forEach(row => {
        const d = new Date(row[0]);
        if (!isNaN(d.getTime())) {
          if (!maxSyncDate || d > maxSyncDate) maxSyncDate = d;
        }
      });
      if (maxSyncDate) {
        const diffMs = now - maxSyncDate;
        h1Fresh = diffMs <= 60 * 60 * 1000; // ≤ 60 min
      }
    }
  }

  // ---------- H2: Sales sync freshness ----------
  const scriptProps = PropertiesService.getScriptProperties();
  const salesLastSyncStr = scriptProps.getProperty('SALES_LAST_SYNC');
  let h2Fresh = true;
  if (salesLastSyncStr) {
    const salesLastSync = new Date(salesLastSyncStr);
    if (!isNaN(salesLastSync.getTime())) {
      const diffMs = now - salesLastSync;
      h2Fresh = diffMs <= 6 * 60 * 60 * 1000; // ≤ 6 h
    }
  }

  // ---------- H3, H4, H5: Farmer 入荷入力 ----------
  const configRows = getConfigRows(); // [vendor, fileId]
  let h3Alert = false;
  let h4Alert = false;
  let h5Warn = false;
  const unprocessedRowsInfo = []; // for detail column (valid dates)
  let unknownDatePendingCount = 0; // pending rows without a usable date

  configRows.forEach(row => {
    const fileId = row[1];
    if (!fileId) return;
    const farmerSs = SpreadsheetApp.openById(fileId);
    const inSheet = farmerSs.getSheetByName('入荷入力');
    if (!inSheet) return;

    const lastRow = inSheet.getLastRow();
    if (lastRow < 2) return; // only header

    const dataRange = inSheet.getRange(2, 1, lastRow - 1, inSheet.getLastColumn()).getValues();

    dataRange.forEach(r => {
      const dateVal = r[0];          // column A
      const statusVal = r[4];        // column E (index 4)
      const skuVal = r[1];           // column B assumed SKU
      const d = new Date(dateVal);
      const validDate = !isNaN(d.getTime());

      // H3: unprocessed rows where column E empty and SKU non‑empty
      if (!statusVal && skuVal) {
        if (validDate) {
          const ageMs = now - d;
          if (ageMs > 60 * 60 * 1000) h3Alert = true;
          unprocessedRowsInfo.push({vendor: row[0], date: d});
        } else {
          unknownDatePendingCount++;
        }
      }

      // H4: SENDING / STUCK
      if (statusVal && typeof statusVal === 'string') {
        if (/^(SENDING |STUCK )/.test(statusVal)) h4Alert = true;
        // H5: ERR
        if (/^ERR /.test(statusVal)) h5Warn = true;
      }
    });
  });

  // ---------- H6: 24h processing count ----------
  let h6Count = 0;
  const logSheet = ss.getSheetByName('Log');
  if (logSheet) {
    const dateColIdx = getColumnIndex(logSheet, '日時');
    if (dateColIdx > 0) {
      const logValues = safeReadRows(logSheet, 2, dateColIdx);
      const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      logValues.forEach(row => {
        const d = new Date(row[0]);
        if (!isNaN(d.getTime()) && d >= cutoff) h6Count++;
      });
    }
  }

  // ---------- Determine overall verdict ----------
  let verdict = 'OK';
  const alerts = !h1Fresh || h3Alert || h4Alert;
  if (alerts) verdict = 'ALERT';
  else if (h5Warn) verdict = 'WARN';

  // ---------- Build detail string ----------
  const details = [];
  if (!h1Fresh) details.push('Inventory sync >60 min old');
  if (!h2Fresh) details.push('Sales sync >6 h old');
  if (h3Alert) {
    const oldest = unprocessedRowsInfo.reduce((old, cur) => !old || cur.date < old.date ? cur : old, null);
    const oldestStr = oldest && oldest.vendor
      ? `oldest ${oldest.date.toISOString()} vendor ${oldest.vendor}`
      : 'unknown';
    details.push(`Unprocessed rows >60 min (${oldestStr})`);
  }
  if (unknownDatePendingCount > 0) {
    details.push(`日付不明の未処理 ${unknownDatePendingCount}件`);
  }
  if (h4Alert) details.push('Rows stuck/sending');
  if (h5Warn) details.push('Error rows present');
  details.push(`24h processed ${h6Count}`);

  // ---------- ADMIN_EMAIL handling ----------
  const adminEmail = scriptProps.getProperty('ADMIN_EMAIL');
  if (!adminEmail) {
    // Ensure a non‑OK verdict and add notice to details
    if (verdict === 'OK') verdict = 'WARN';
    details.push('ADMIN_EMAIL 未設定のため通知できません');
  }

  // ---------- Insert row at top ----------
  healthSheet.insertRowBefore(2);
  const totalPending = unprocessedRowsInfo.length + unknownDatePendingCount;
  const newRow = [
    now.toISOString(),
    verdict,
    h1Fresh ? 'OK' : 'STALE',
    h2Fresh ? 'OK' : 'STALE',
    h3Alert ? 'ALERT' : (totalPending > 0 ? `PENDING ${totalPending}` : 'NONE'),
    h4Alert ? 'ALERT' : 'NONE',
    h5Warn ? 'WARN' : 'NONE',
    h6Count,
    details.join(' | ')
  ];
  healthSheet.getRange(2, 1, 1, newRow.length).setValues([newRow]);

  // ---------- Email notifications ----------
  const nowMs = now.getTime();

  // Helper to decide if enough time passed for a rate‑limit property
  function shouldSend(propKey, intervalMs) {
    const lastStr = scriptProps.getProperty(propKey);
    if (!lastStr) return true;
    const lastMs = new Date(lastStr).getTime();
    return (nowMs - lastMs) >= intervalMs;
  }

  // Alert / Warn email
  if (adminEmail && verdict !== 'OK' && shouldSend('HEALTH_LAST_MAIL', 6 * 60 * 60 * 1000)) {
    const subject = `Health check ${verdict}`;
    const body = `Verdict: ${verdict}\nDetails:\n${details.join('\n')}`;
    MailApp.sendEmail(adminEmail, subject, body);
    scriptProps.setProperty('HEALTH_LAST_MAIL', now.toISOString());
  }

  // Weekly summary on Monday
  const dayOfWeek = now.getDay(); // Sunday=0, Monday=1, …
  if (adminEmail && dayOfWeek === 1 && shouldSend('HEALTH_LAST_WEEKLY', 7 * 24 * 60 * 60 * 1000)) {
    const subject = `Weekly health summary`;
    const body = verdict === 'OK'
      ? `All systems healthy this week. No alerts.\nDetails:\n${details.join('\n')}`
      : `Health status ${verdict} this week. See details:\n${details.join('\n')}`;
    MailApp.sendEmail(adminEmail, subject, body);
    scriptProps.setProperty('HEALTH_LAST_WEEKLY', now.toISOString());
  }
}

/**
 * Menu entry wrapper for dailyHealthCheck().
 * Executes the check and shows a toast with the verdict.
 */
function menuHealthCheck() {
  try {
    dailyHealthCheck();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Retrieve the most recent verdict from Health sheet (row 2 after insertion)
    const healthSheet = ss.getSheetByName('Health');
    const verdictCell = healthSheet ? healthSheet.getRange(2, 2).getValue() : 'UNKNOWN';
    ss.toast(`Health check completed: ${verdictCell}`, 'Health');
  } catch (e) {
    SpreadsheetApp.getActiveSpreadsheet().toast(`Error during health check: ${e.message}`, 'Health', 5);
    throw e;
  }
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
    .addSeparator()
    .addItem('稼働状況をチェック', 'menuHealthCheck')
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

/**
 * installHealthCheckTrigger()
 * dailyHealthCheck を2時間おきに回すトリガーを作る。既存の同名トリガーは先に削除する。
 * ⚠️ Apps Script のUIに「3時間おき」は存在しない（1/2/4/6/8/12時間）。短い側の2時間を採用。
 * これで3本の設置関数が揃う: installTrigger(runSync/10分) ·
 * installSalesSyncTrigger(syncSalesHistory/30分) · installHealthCheckTrigger(dailyHealthCheck/2時間)
 */
function installHealthCheckTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'dailyHealthCheck')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyHealthCheck').timeBased().everyHours(2).create();
}
