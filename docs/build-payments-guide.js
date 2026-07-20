// Builds docs/Shopify-Payments-登録手順書.docx
// Content is transcribed from the live Shopify admin wizard (2026-07-20), not from documentation.
// Screenshots: pass a directory of images as argv[2]; files named 01.png/02.png/... are placed in
// order at the [[SHOT:n]] markers. Missing files fall back to a labelled placeholder frame.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
} = require('docx');

const SHOTS = process.argv[2] || null;
const JP = 'Hiragino Sans';
const RED = 'D94050';
const INK = '2B2420';
const GREIGE = '6E6256';
const LINE = 'D8CFC6';

const W = 9360; // usable width (A4 portrait, DXA)

function shot(n, caption) {
  const out = [];
  let file = null;
  if (SHOTS) {
    for (const ext of ['png', 'jpg', 'jpeg']) {
      const p = path.join(SHOTS, `${String(n).padStart(2, '0')}.${ext}`);
      if (fs.existsSync(p)) { file = p; break; }
    }
  }
  if (file) {
    const buf = fs.readFileSync(file);
    const ext = path.extname(file).slice(1).toLowerCase();
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      // Aspect ratio is read from the PNG header rather than assumed — the captures are
      // cropped to remove the browser chrome, so their ratio is not the raw window ratio.
      children: [new ImageRun({
        data: buf, type: ext === 'jpeg' ? 'jpg' : ext,
        transformation: (() => {
          const W_PT = 600;
          if (ext === 'png' && buf.length > 24 && buf.readUInt32BE(12) === 0x49484452) {
            const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
            return { width: W_PT, height: Math.round(W_PT * h / w) };
          }
          return { width: W_PT, height: Math.round(W_PT * 0.55) };
        })(),
      })],
    }));
  } else {
    out.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 160, after: 60 },
      border: {
        top: { style: BorderStyle.DASHED, size: 6, color: LINE },
        bottom: { style: BorderStyle.DASHED, size: 6, color: LINE },
        left: { style: BorderStyle.DASHED, size: 6, color: LINE },
        right: { style: BorderStyle.DASHED, size: 6, color: LINE },
      },
      shading: { type: ShadingType.CLEAR, fill: 'FAF7F4' },
      children: [new TextRun({
        text: `［ スクリーンショット ${n} 挿入位置 ］`,
        font: JP, size: 20, color: GREIGE,
      })],
    }));
  }
  out.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 220 },
    children: [new TextRun({ text: `図 ${n}：${caption}`, font: JP, size: 18, color: GREIGE })],
  }));
  return out;
}

const h1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 160 },
  children: [new TextRun({ text: t, font: JP, size: 30, bold: true, color: INK })],
});
const h2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 120 },
  children: [new TextRun({ text: t, font: JP, size: 24, bold: true, color: RED })],
});
const p = (t, opt = {}) => new Paragraph({
  spacing: { after: opt.after ?? 120 }, indent: opt.indent,
  children: [new TextRun({ text: t, font: JP, size: 21, color: opt.color || INK, bold: opt.bold })],
});
const note = (t) => new Paragraph({
  spacing: { before: 100, after: 200 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: RED, space: 10 } },
  indent: { left: 200 },
  children: [new TextRun({ text: t, font: JP, size: 20, color: GREIGE })],
});
const bullet = (t) => new Paragraph({
  bullet: { level: 0 }, spacing: { after: 70 },
  children: [new TextRun({ text: t, font: JP, size: 21, color: INK })],
});
const check = (t) => new Paragraph({
  spacing: { after: 80 }, indent: { left: 200 },
  children: [
    new TextRun({ text: '☐  ', font: JP, size: 22, color: RED }),
    new TextRun({ text: t, font: JP, size: 21, color: INK }),
  ],
});

function table(headers, rows, widths) {
  const cell = (txt, o = {}) => new TableCell({
    width: { size: o.w, type: WidthType.DXA },
    shading: o.head ? { type: ShadingType.CLEAR, fill: 'F3EBE3' } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: txt, font: JP, size: 20, bold: o.head, color: o.head ? INK : GREIGE })],
    })],
  });
  return new Table({
    columnWidths: widths,
    width: { size: W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: LINE },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: LINE },
      left: { style: BorderStyle.SINGLE, size: 4, color: LINE },
      right: { style: BorderStyle.SINGLE, size: 4, color: LINE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: LINE },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: LINE },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((hh, i) => cell(hh, { head: true, w: widths[i], center: i > 0 && headers.length > 2 })),
      }),
      ...rows.map(r => new TableRow({
        children: r.map((c, i) => cell(c, { w: widths[i], center: i === 1 && r.length === 3 })),
      })),
    ],
  });
}

const doc = new Document({
  styles: { default: { document: { run: { font: JP, size: 21, color: INK } } } },
  sections: [{
    properties: { page: { margin: { top: 1200, bottom: 1200, left: 1080, right: 1080 } } },
    children: [
      // ---- cover ----
      new Paragraph({
        spacing: { before: 800, after: 60 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Ichigo オンラインストア', font: JP, size: 22, color: GREIGE })],
      }),
      new Paragraph({
        spacing: { after: 100 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Shopify ペイメント 登録手順書', font: JP, size: 40, bold: true, color: INK })],
      }),
      new Paragraph({
        spacing: { after: 700 }, alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: RED, space: 12 } },
        children: [new TextRun({ text: '登記済み法人としてご登録される場合', font: JP, size: 22, color: RED })],
      }),
      table(['項目', '内容'], [
        ['対象ストア', '0ydzis-vt.myshopify.com'],
        ['作成日', '2026年7月20日'],
        ['事業形態', '登記済み法人'],
        ['所要時間の目安', '30〜45分（書類が手元にある場合）'],
      ], [2600, 6760]),

      h2('この手順書について'),
      p('実際の管理画面を開き、表示される項目を一つずつ確認しながら作成しています。'),
      note('ステップ 1〜2 は実画面で確認済みです。ステップ 3 以降は、先へ進むために実際の法人情報の入力が必要となるため確認しておりません。該当箇所にその旨を明記しています。'),

      new Paragraph({ children: [new PageBreak()] }),

      // ---- prep ----
      h1('1. 事前にご用意いただくもの'),
      p('登録を始める前に手元に揃えておくと、中断せずに完了できます。'),

      h2('必ず必要（ステップ 2 で入力）'),
      check('登記上の法人名（漢字）　※屋号ではなく登記簿どおりの正式名称'),
      check('登記上の法人名（カナ）'),
      check('登記上の法人名（ローマ字）'),
      check('法人番号（13桁）　※国税庁の法人番号公表サイトで確認できます'),
      check('登記上の本店所在地（郵便番号・都道府県・市区町村・町名・丁目・番地・号）'),
      check('電話番号'),

      h2('ステップ 3 以降で必要になる見込み'),
      note('Shopify ペイメントは金融サービスのため本人確認（KYC）が求められます。以下は一般的に必要とされるものです。実画面での確認は行っておりませんので、目安としてご覧ください。'),
      check('代表者の情報（氏名／生年月日／住所）'),
      check('代表者の本人確認書類（運転免許証・パスポート・マイナンバーカード等）'),
      check('実質的支配者の情報　※議決権を一定割合以上お持ちの方がいる場合'),
      check('入金先の法人銀行口座（金融機関名／支店名／口座種別／口座番号／口座名義カナ）'),
      check('取扱商品・事業内容の説明'),
      check('明細書表記　※お客様のカード明細に表示される名称'),

      h2('手数料'),
      table(['項目', '内容'], [
        ['取引手数料', 'なし（Shopify ペイメント利用時）'],
        ['カード手数料', '3.55% + ¥0 から'],
        ['対応決済手段', 'Shop Pay / VISA / Mastercard / American Express / JCB / Apple Pay ほか'],
      ], [2600, 6760]),
      note('現在は PayPal（取引手数料 2%）が設定途中の状態です。Shopify ペイメントを有効にすると取引手数料が不要になるため、費用面でも有利です。'),

      new Paragraph({ children: [new PageBreak()] }),

      // ---- steps ----
      h1('2. 登録手順'),

      h2('ステップ 0：決済設定を開く'),
      bullet('Shopify 管理画面にログインします'),
      bullet('左サイドバー最下部の「設定」をクリックします'),
      bullet('設定メニューから「決済」を選択します'),
      bullet('画面上部「Shopify ペイメント」欄の「設定を完了」ボタンをクリックします'),
      ...shot(1, '設定 → 決済。「Shopify ペイメント」欄の「設定を完了」から開始します'),

      h2('ステップ 1/6：事業形態'),
      p('3つの選択肢が表示されます。'),
      table(['選択肢', '説明'], [
        ['個人', '法人登録はしておらず、個人名義でストアを運営しています'],
        ['登記済み法人', 'このストアを所有するビジネスがあり、日本政府に登記されています'],
        ['非営利団体', 'このストアを所有する非営利団体があり、日本政府に登記されています'],
      ], [2600, 6760]),
      p('「登記済み法人」を選択すると、直下に「事業形態を選択」のドロップダウンが表示されます。「会社」を選択して「次へ」をクリックしてください。', { after: 60 }),
      note('現在このドロップダウンには「会社」のみが表示されます。'),
      ...shot(2, 'ステップ 1/6。「登記済み法人」を選ぶとドロップダウンが表示されます'),

      new Paragraph({ children: [new PageBreak()] }),

      h2('ステップ 2/6：ビジネスの詳細'),
      p('登記簿の記載どおりに入力してください。屋号やブランド名ではありません。', { bold: true }),

      p('法人情報', { bold: true, after: 80 }),
      table(['項目', '必須', '補足'], [
        ['登記上の法人名（漢字）', '●', '会社の正式な登記名'],
        ['登記上の法人名（カナ）', '●', ''],
        ['登記上の法人名（ローマ字）', '●', ''],
        ['法人番号', '●', '13桁'],
        ['電話番号', '', '国番号 +81（日本）が既定'],
      ], [3400, 900, 5060]),

      p('ビジネスの住所', { bold: true, after: 80 }),
      p('「法的に登記されているビジネスの住所を入力してください」と案内されます。', { after: 80 }),
      table(['項目', '必須', '補足'], [
        ['国 / 地域', '—', '日本で固定（変更不可）'],
        ['郵便番号', '', '入力すると住所が自動補完されます'],
        ['都道府県', '', 'プルダウン選択'],
        ['市区町村', '', ''],
        ['町名', '', ''],
        ['丁目', '', '例：６'],
        ['番地・号', '●', '例：１２ー１８'],
        ['建物名（漢字）', '', '任意'],
        ['建物名（カナ）', '', '任意'],
      ], [3400, 900, 5060]),
      note('● 印は、未入力のまま「次へ」を押すとエラーになる項目です（実際に確認済み）。'),
      ...shot(3, 'ステップ 2/6。法人情報の入力欄'),
      ...shot(4, 'ステップ 2/6（下部）。ビジネスの住所の入力欄'),

      new Paragraph({ children: [new PageBreak()] }),

      h2('ステップ 3/6 〜 6/6'),
      note('本手順書では、実際の法人情報を入力せずに確認できる範囲がステップ 2 までのため、ステップ 3 以降の画面は未確認です。'),
      p('進行状況は画面上部に「ステップ ○/6」と表示されます。ステップ 2 の完了後、残り4ステップとなります。'),
      p('前ページの「ステップ 3 以降で必要になる見込み」に挙げた情報を順に求められる想定です。'),
      bullet('各ステップは「戻る」で前の画面に戻れます'),
      bullet('途中で画面を閉じても、決済設定画面の「設定を完了」から再開できます'),

      h1('3. 登録後について'),
      bullet('Shopify による審査があります。審査中も一時的に決済を受け付けられる場合がありますが、入金は審査完了後となります'),
      bullet('追加の書類提出を求められることがあります。管理画面の通知をご確認ください'),
      bullet('有効化されると、決済設定画面の「Shopify ペイメント」欄の表示が有効状態に変わります'),

      h1('4. ご注意'),
      p('法人口座をご用意ください', { bold: true, after: 40 }),
      p('法人として登録する場合、個人名義の口座は通常受け付けられません。', { after: 160 }),
      p('登記情報と完全に一致させてください', { bold: true, after: 40 }),
      p('法人名・住所が登記簿と異なると、審査で差し戻されます。', { after: 160 }),
      p('明細書表記にご注意ください', { bold: true, after: 40 }),
      p('お客様のカード明細に表示される名称です。ストア名と大きく異なると「身に覚えのない請求」としてチャージバック（不正利用申告）の原因になります。', { after: 160 }),

      h1('5. 弊社側の対応事項'),
      p('Shopify ペイメントが有効化されましたら、弊社にてサイト側を更新いたします。'),
      bullet('サイト上の決済手段の表示を、実際に利用可能な手段に合わせて更新します（現在 GCash・Maya・VISA・Mastercard を表示していますが、実態に合わせて差し替えます）'),
      bullet('テスト決済ゲートウェイを無効化します'),
      bullet('実際の決済フローの動作確認を行います'),

      h2('弊社にて確認が必要な事項'),
      bullet('Shopify ペイメント（日本）で、フィリピンのお客様からペソ建てのお支払いを受け付けられるかは未検証です。有効化後に実地確認いたします'),
      bullet('現在ストアの表示通貨はペソ、決済通貨は円ベースの自動換算となっています'),
    ],
  }],
});

const out = path.join(__dirname, 'Shopify-Payments-登録手順書.docx');
Packer.toBuffer(doc).then(b => { fs.writeFileSync(out, b); console.log('wrote', out, b.length, 'bytes'); });
