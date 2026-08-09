/**
 * ichigo — 販売履歴 + 在庫台帳 (Sales.gs)
 *
 * 仕様: docs/sales-history-spec.md
 * 生成: ローカル fleet (`brain`) 2026-08-10 / QA・修正指示・監査: Fable
 *
 * 既存の Code.gs / Setup.gs / Api.gs は一切変更しない。追加のみ。
 *
 * 設計上の不変条件 — 変更するときはここを読むこと:
 *   - このファイルは Shopify に対して READ ONLY。在庫ミューテーションを絶対に書かないこと。
 *   - `販売履歴` と `入荷入力` を1つのテーブルに統合しないこと。統合すると
 *     pushPendingAdjustments が販売行(負数)を「未処理の入荷」と見なして Shopify に送り、
 *     既に記録済みの販売を二重に引く。テーブルが別なら、その経路が構造的に存在しない。
 *   - 農家の振り分けは **vendor**。SKU では引かないこと — line item は注文時点のSKUを保持しており、
 *     2026-08-09 の採番変更前の注文は旧スラッグSKUのままで現行SKUと一致しない（実測確認済み）。
 *   - 冪等性の根拠は E列(キー)に実在する値。スクリプトプロパティではない。プロパティが飛んでも
 *     二重記録しない。
 *   - `在庫台帳` は数式だけのビュー。実体データを持たせないこと（持たせた瞬間に不整合が生まれる）。
 */
/**
 * Helper to read Config rows, throwing if the sheet is missing.
 */
function getConfigRows() {
  const cfgSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  if (!cfgSheet) throw new Error("Missing Config sheet");
  return readConfigRows(cfgSheet);
}

/**
 * Creates the required sales sheets ("販売履歴" and "在庫台帳") in each farm spreadsheet,
 * if they do not already exist. Protects the sheets so only the script author can edit.
 */
function setupSalesSheets() {
  const configRows = getConfigRows(); // [[vendor, fileId], ...]
  const authorEmail = Session.getEffectiveUser().getEmail();

  configRows.forEach(([vendor, fileId]) => {
    const farm = SpreadsheetApp.openById(fileId);

    // --- 販売履歴 sheet -------------------------------------------------
    let salesSheet = farm.getSheetByName('販売履歴');
    if (!salesSheet) {
      salesSheet = farm.insertSheet('販売履歴');
      // Header row (5 columns: 日付, SKU, 数量, 備考, キー)
      salesSheet.getRange(1, 1, 1, 5).setValues([['日付', 'SKU', '数量', '備考', 'キー']]);
      salesSheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd hh:mm');
    } else {
      // Ensure キー column header exists
      const lastCol = salesSheet.getLastColumn();
      if (lastCol < 5) salesSheet.insertColumnsAfter(lastCol, 5 - lastCol);
      const keyHeader = salesSheet.getRange(1, 5).getValue();
      if (!keyHeader) salesSheet.getRange(1, 5).setValue('キー');
    }
    // Protect
    const protection = salesSheet.protect();
    protection.removeEditors(
      protection.getEditors().filter(function (u) {
        return u.getEmail() !== authorEmail;
      })
    );

    // --- 在庫台帳 sheet -------------------------------------------------
    let ledgerSheet = farm.getSheetByName('在庫台帳');
    if (!ledgerSheet) {
      ledgerSheet = farm.insertSheet('在庫台帳');
      // Header row (4 columns)
      ledgerSheet.getRange(1, 1, 1, 4).setValues([['日付', 'SKU', '数量', '備考']]);
      // Formula to combine 入荷入力 and 販売履歴, handling empty sources
      const formula =
        '=IFERROR(QUERY({IFERROR(QUERY(入荷入力!A2:D,"select A,B,C,D where B is not null",0),{"","","",""});IFERROR(QUERY(販売履歴!A2:D,"select A,B,C,D where B is not null",0),{"","","",""})},"select Col1,Col2,Col3,Col4 where Col2 is not null order by Col1 desc",0),"（まだデータがありません）")';
      ledgerSheet.getRange('A2').setFormula(formula);
      ledgerSheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd hh:mm');
    } else {
      // Ensure formula exists (in case sheet existed without it)
      const formulaCell = ledgerSheet.getRange('A2');
      if (!formulaCell.getFormula()) {
        const formula =
          '=IFERROR(QUERY({IFERROR(QUERY(入荷入力!A2:D,"select A,B,C,D where B is not null",0),{"","","",""});IFERROR(QUERY(販売履歴!A2:D,"select A,B,C,D where B is not null",0),{"","","",""})},"select Col1,Col2,Col3,Col4 where Col2 is not null order by Col1 desc",0),"（まだデータがありません）")';
        formulaCell.setFormula(formula);
      }
    }
    // Protect
    const ledgerProtection = ledgerSheet.protect();
    ledgerProtection.removeEditors(
      ledgerProtection.getEditors().filter(function (u) {
        return u.getEmail() !== authorEmail;
      })
    );
  });
}

/**
 * Synchronizes Shopify order history into each farm's 販売履歴 sheet.
 * Idempotent: entries are added only if their unique key (order|sku[|C]) is absent.
 * Records progress in the script property 'SALES_LAST_SYNC' only after successful completion.
 */
function syncSalesHistory() {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(30000)) return; // another instance is running

    const props = PropertiesService.getScriptProperties();
    let since = props.getProperty('SALES_LAST_SYNC');
    if (!since) {
      // Default to 30 days ago
      const d = new Date();
      d.setDate(d.getDate() - 30);
      since = d.toISOString();
    }
    const nowIso = new Date().toISOString();

    // Build vendor → farm data map (sheet, existingKeys set, rows to append)
    const configRows = getConfigRows(); // [[vendor, fileId], ...]
    const vendorMap = new Map();
    configRows.forEach(([vendor, fileId]) => {
      const farm = SpreadsheetApp.openById(fileId);
      const salesSheet = farm.getSheetByName('販売履歴');
      if (!salesSheet) {
        // Create sheet on-the-fly (should already exist via setupSalesSheets)
        const newSheet = farm.insertSheet('販売履歴');
        newSheet.getRange(1, 1, 1, 5).setValues([['日付', 'SKU', '数量', '備考', 'キー']]);
        newSheet.getRange('A2:A').setNumberFormat('yyyy-mm-dd hh:mm');
        salesSheet = newSheet;
      }
      // Build existing key set from column E (キー)
      const lastRow = salesSheet.getLastRow();
      const existingKeys = new Set();
      if (lastRow >= 2) {
        const keyRange = salesSheet.getRange(2, 5, lastRow - 1, 1);
        const keyVals = keyRange.getValues();
        keyVals.forEach(row => {
          if (row[0]) existingKeys.add(row[0].toString());
        });
      }
      vendorMap.set(vendor, {
        farmFileId: fileId,
        salesSheet: salesSheet,
        existingKeys: existingKeys,
        rowsToAppend: [] // each element is [dateStr, sku, qty, remark, uniqueKey]
      });
    });

    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
      const gqlQuery = `
query ($cursor: String) {
  orders(first:100, after:$cursor, query:"updated_at:>=${since}") {
    edges {
      node {
        name createdAt cancelledAt test updatedAt processedAt displayFinancialStatus
        lineItems(first:100) {
          edges {
            node { sku quantity vendor name title id }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
      const variables = { cursor };
      const response = shopifyGraphql(gqlQuery, variables);

      if (!response || response.errors) {
        notifyAdmin('Shopify GraphQL error: ' + JSON.stringify(response?.errors));
        return;
      }

      const orderEdges = response.data?.orders?.edges || [];
      for (const edge of orderEdges) {
        const order = edge.node;
        const baseName = order.name; // e.g., "#1042"
        const isTest = !!order.test;
        const createdAt = order.createdAt; // ISO string
        const cancelledAt = order.cancelledAt; // may be null

        const lineItemEdges = (order.lineItems?.edges) || [];
        for (const liEdge of lineItemEdges) {
          const li = liEdge.node;
          const vendorKey = li.vendor;

          if (!vendorMap.has(vendorKey)) {
            // Vendor not configured – log and continue
            appendLogRow({
              sku: li.sku,
              delta: null,
              result: 'skip-no-vendor',
              farmFileId: null,
              rowNum: null,
              detail: `Vendor ${vendorKey} not in config`
            });
            continue;
          }

          const vendorData = vendorMap.get(vendorKey);
          const { salesSheet, existingKeys, rowsToAppend } = vendorData;

          const isCancellation = !!cancelledAt;
          const uniqueKey = `${baseName}|${li.sku}${isCancellation ? '|C' : ''}`;
          if (existingKeys.has(uniqueKey)) continue; // already recorded

          // Fable QA fix 2026-08-10: write a real Date, NOT the ISO string.
          // Sheets' QUERY() requires a homogeneous column type; an ISO STRING sitting in a column
          // whose other source (入荷入力) holds real dates is treated as the minority type and comes
          // out BLANK in 在庫台帳. Measured: the #1002 row appeared with an empty 日付.
          const dateStr = new Date(isCancellation ? cancelledAt : createdAt);
          const signedQty = isCancellation ? li.quantity : -li.quantity;

          let remark = baseName; // order.name already includes '#'
          if (isTest) remark += ' (テスト)';
          if (isCancellation) remark += ' (取消)';

          rowsToAppend.push([dateStr, li.sku, signedQty, remark, uniqueKey]);
          existingKeys.add(uniqueKey); // prevents duplicate within this run
        }
      }

      const pageInfo = response.data?.orders?.pageInfo;
      hasNextPage = !!pageInfo?.hasNextPage;
      cursor = pageInfo?.endCursor || null;
    }

    // Batch append rows per farm
    vendorMap.forEach(vendorData => {
      const { farmFileId, salesSheet, rowsToAppend } = vendorData;
      if (rowsToAppend.length === 0) return;

      const startRow = salesSheet.getLastRow() + 1;
      const range = salesSheet.getRange(startRow, 1, rowsToAppend.length, 5);
      range.setValues(rowsToAppend);

      // Log each appended row
      rowsToAppend.forEach((rowVals, idx) => {
        const [dateStr, sku, qty, remark, uniqueKey] = rowVals;
        appendLogRow({
          sku: sku,
          delta: qty,
          result: 'added',
          farmFileId: farmFileId,
          rowNum: startRow + idx,
          detail: uniqueKey
        });
      });
    });

    // All pages processed successfully – update the sync marker
    props.setProperty('SALES_LAST_SYNC', nowIso);
  } catch (e) {
    notifyAdmin('syncSalesHistory error: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Installs a time‑driven trigger that runs syncSalesHistory every 30 minutes.
 * Can be called manually once after setupSalesSheets().
 */
function installSalesSyncTrigger() {
  // Remove any existing trigger for this function to avoid duplicates
  const allTriggers = ScriptApp.getProjectTriggers();
  allTriggers.forEach(t => {
    if (t.getHandlerFunction() === 'syncSalesHistory') ScriptApp.deleteTrigger(t);
  });

  // Create a new trigger
  ScriptApp.newTrigger('syncSalesHistory')
    .timeBased()
    .everyMinutes(30)
    .create();
}
