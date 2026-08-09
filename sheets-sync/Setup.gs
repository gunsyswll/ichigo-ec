/**
 * ichigo — Sheets⇄Shopify 在庫同期: 初回セットアップ (Setup.gs)
 *
 * Code.gs と同じ Apps Script プロジェクトに置くこと（グローバルスコープを共有するので
 * readConfigRows() など Code.gs の関数をそのまま呼べる。同名関数を二重定義しないこと）。
 *
 * 使い方: setupWorkspace() を1回だけ手動実行 → 実行ログに農家ファイルのURLが出る。
 * 共有（農家への編集権付与）は意図的に自動化していない — 誰に見せるかは人間の判断。
 * 何度実行しても安全（既存ファイルを作り直さない）。
 */
/**
 * Set up workspace sheets and per-vendor inventory spreadsheets.
 *
 * Assumes the following helpers already exist in the script project:
 *   - shopifyGraphql(query, variables) : returns a JSON response from Shopify GraphQL.
 *   - syncProductsFromShopify, pushPendingAdjustments, runSync, installTrigger
 *
 * The function is idempotent: running it multiple times never duplicates data.
 */
function setupWorkspace() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // -------------------------------------------------------------------------
  // 1. Ensure main sheets exist with correct headers and freeze row 1.
  const requiredSheets = {
    'Products': ['SKU', '商品名', '販売元', 'Shopify在庫', '最終同期', '状態'],
    'Log':      ['日時', 'SKU', 'delta', '結果', '農家ファイル', '行', '詳細'],
    'Config':   ['販売元(vendor)', 'スプレッドシートID']
  };

  // Create missing sheets with header rows.
  for (const [sheetName, headers] of Object.entries(requiredSheets)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setValues([headers]);
    } else {
      // Ensure row 1 is frozen (in case it was accidentally unfrozen).
      sheet.setFrozenRows(1);
      // If header row is empty, write the expected headers.
      const firstCell = sheet.getRange(1, 1).getValue();
      if (!firstCell) {
        const headerRange = sheet.getRange(1, 1, 1, headers.length);
        headerRange.setValues([headers]);
      }
    }
    sheet.setFrozenRows(1);
  }

  // Delete the default 'Sheet1' / 'シート1' if it is empty and other sheets exist.
  const defaultSheet = ss.getSheets().find(s => ['Sheet1', 'シート1'].includes(s.getName()));
  if (defaultSheet) {
    const lastRow = defaultSheet.getLastRow();
    const lastColumn = defaultSheet.getLastColumn();
    // Empty if both are zero or only the first row is empty.
    const isEmpty = (lastRow === 0 && lastColumn === 0) ||
                    (lastRow === 1 && defaultSheet.getRange(1, 1).isBlank() && lastColumn === 0);
    if (isEmpty && ss.getSheets().length > 1) {
      ss.deleteSheet(defaultSheet);
    }
  }

  // -------------------------------------------------------------------------
  // 2. Query Shopify for distinct vendors (without invoking syncProductsFromShopify).
  const vendorSet = new Set();
  let cursor = null;
  do {
    const query = `
      query($cursor: String) {
        products(first:100, after:$cursor) {
          edges { node { vendor } }
          pageInfo { hasNextPage endCursor }
        }
      }`;
    const variables = cursor ? {cursor} : {};
    const resp = shopifyGraphql(query, variables);
    if (!resp || !resp.data || !resp.data.products) break;

    const edges = resp.data.products.edges;
    for (const edge of edges) {
      if (edge && edge.node && edge.node.vendor) vendorSet.add(edge.node.vendor);
    }
    const pageInfo = resp.data.products.pageInfo;
    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

  // -------------------------------------------------------------------------
  // 3. For each new vendor, create a dedicated spreadsheet and register it.
  const configSheet = ss.getSheetByName('Config');
  const existingRows = readConfigRows(configSheet);
  const existingVendorsValues = existingRows.map(row => row[0]).filter(v => v);
  const existingVendors = new Set(existingVendorsValues);

  const ownerEmail = Session.getEffectiveUser().getEmail();

  const newVendorUrls = {};

  for (const vendor of vendorSet) {
    if (existingVendors.has(vendor)) continue; // Already registered.

    // Create new spreadsheet.
    const newSs = SpreadsheetApp.create(`いちご在庫 — ${vendor}`);
    const newId = newSs.getId();

    // 入荷入力 sheet.
    let inputSheet = newSs.getSheetByName('入荷入力');
    if (!inputSheet) {
      inputSheet = newSs.insertSheet('入荷入力');
      const headersInput = ['日付', 'SKU', '入荷数', 'メモ', '処理状態(自動)', '処理日時(自動)'];
      inputSheet.getRange(1, 1, 1, headersInput.length).setValues([headersInput]);
    }
    inputSheet.setFrozenRows(1);

    // 商品一覧 sheet.
    let productListSheet = newSs.getSheetByName('商品一覧');
    if (!productListSheet) {
      productListSheet = newSs.insertSheet('商品一覧');
      const headersProduct = ['SKU', '商品名', '現在庫'];
      productListSheet.getRange(1, 1, 1, headersProduct.length).setValues([headersProduct]);
    }
    productListSheet.setFrozenRows(1);

    // Delete the default first sheet if it is empty and unused.
    const defaultNewSheet = newSs.getSheets().find(s => ['Sheet1', 'シート1'].includes(s.getName()));
    if (defaultNewSheet) {
      const lastRow = defaultNewSheet.getLastRow();
      const lastColumn = defaultNewSheet.getLastColumn();
      const isEmpty = (lastRow === 0 && lastColumn === 0) ||
                      (lastRow === 1 && defaultNewSheet.getRange(1, 1).isBlank() && lastColumn === 0);
      if (isEmpty) newSs.deleteSheet(defaultNewSheet);
    }

    // Protect columns E and F of 入荷入力.
    const protectRangeInput = inputSheet.getRange(2, 5, inputSheet.getMaxRows() - 1, 2); // rows 2..end, cols E,F
    const protectionInput = protectRangeInput.protect();
    protectionInput.setWarningOnly(false);
    // Remove all editors, then add owner.
    const editors = protectionInput.getEditors();
    for (const e of editors) {
      if (e.getEmail() !== ownerEmail) protectionInput.removeEditor(e);
    }
    protectionInput.addEditor(ownerEmail);

    // Protect all columns of 商品一覧.
    const protectRangeProduct = productListSheet.getRange(2, 1, productListSheet.getMaxRows() - 1, productListSheet.getLastColumn());
    const protectionProduct = protectRangeProduct.protect();
    protectionProduct.setWarningOnly(false);
    const editorsProd = protectionProduct.getEditors();
    for (const e of editorsProd) {
      if (e.getEmail() !== ownerEmail) protectionProduct.removeEditor(e);
    }
    protectionProduct.addEditor(ownerEmail);

    // Data validation on 入荷数 column (C) – any number, allow negatives.
    const colCRange = inputSheet.getRange(2, 3, inputSheet.getMaxRows() - 1);
    const dvBuilder = SpreadsheetApp.newDataValidation()
      .requireNumberBetween(-100000, 100000)
      .setAllowInvalid(false)
      .setHelpText('入荷数は数値。訂正はマイナス値で。');
    colCRange.setDataValidation(dvBuilder.build());

    // Append to Config sheet.
    const appendRow = [vendor, newId];
    configSheet.appendRow(appendRow);

    // Log URL.
    const url = newSs.getUrl();
    Logger.log(`Created spreadsheet for vendor '${vendor}': ${url}`);
    newVendorUrls[vendor] = url;
  }

  // -------------------------------------------------------------------------
  // 4. Summary log.
  const summaryLines = [];
  for (const [vendor, url] of Object.entries(newVendorUrls)) {
    summaryLines.push(`Vendor: ${vendor} → ${url}`);
  }
  if (summaryLines.length) {
    Logger.log('SetupWorkspace summary:\n' + summaryLines.join('\n'));
  } else {
    Logger.log('SetupWorkspace completed – no new vendor spreadsheets needed.');
  }
}

/**
 * Print all farmer file URLs recorded in the Config sheet.
 */
function printFarmerFileUrls() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configSheet = ss.getSheetByName('Config');
  if (!configSheet) {
    Logger.log('Config sheet not found.');
    return;
  }
  const rows = readConfigRows(configSheet);
  if (rows.length === 0) {
    Logger.log('Config sheet is empty.');
    return;
  }
  for (const [vendor, fileId] of rows) {
    const url = `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
    Logger.log(`Vendor: ${vendor} → ${url}`);
  }
}
