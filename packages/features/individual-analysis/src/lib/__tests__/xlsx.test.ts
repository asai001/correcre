import { buildXlsx, normalizeSheetName, toColumnName } from "../xlsx";

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

/** 生成した ZIP を読み戻すための最小リーダー（無圧縮エントリのみを想定） */
function readZipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const entries = new Map<string, string>();
  let offset = 0;

  while (offset + 4 <= bytes.length && view.getUint32(offset, true) === LOCAL_FILE_HEADER_SIGNATURE) {
    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;

    expect(compressionMethod).toBe(0);
    expect(compressedSize).toBe(uncompressedSize);

    entries.set(
      decoder.decode(bytes.subarray(nameStart, nameStart + nameLength)),
      decoder.decode(bytes.subarray(dataStart, dataStart + compressedSize)),
    );
    offset = dataStart + compressedSize;
  }

  return { entries, centralDirectoryOffset: offset };
}

describe("toColumnName", () => {
  it("0 始まりの列番号を A1 形式の列名に変換する", () => {
    expect(toColumnName(0)).toBe("A");
    expect(toColumnName(25)).toBe("Z");
    expect(toColumnName(26)).toBe("AA");
    expect(toColumnName(701)).toBe("ZZ");
    expect(toColumnName(702)).toBe("AAA");
  });
});

describe("normalizeSheetName", () => {
  it("未指定なら既定名を使う", () => {
    expect(normalizeSheetName(undefined)).toBe("Sheet1");
    expect(normalizeSheetName("   ")).toBe("Sheet1");
  });

  it("禁止文字を置換し 31 文字までに丸める", () => {
    expect(normalizeSheetName("報告/内容:2026")).toBe("報告_内容_2026");
    expect(normalizeSheetName("あ".repeat(40))).toHaveLength(31);
  });
});

describe("buildXlsx", () => {
  const rows = [
    ["日付", "社員名", "入力内容"],
    ["2026-05-01 09:30", "浅井 元輝", 'A & B <c> "d"'],
    ["2026-05-02 10:00", "山田 太郎", 12345],
  ];

  it("Excel が開ける ZIP コンテナとして必要なパートを含む", () => {
    const { entries, centralDirectoryOffset } = readZipEntries(buildXlsx(rows, { sheetName: "報告内容" }));

    expect([...entries.keys()]).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(centralDirectoryOffset).toBeGreaterThan(0);
  });

  it("セントラルディレクトリと EOCD をエントリ数どおりに書き出す", () => {
    const bytes = buildXlsx(rows);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const { entries, centralDirectoryOffset } = readZipEntries(bytes);

    expect(view.getUint32(centralDirectoryOffset, true)).toBe(CENTRAL_DIRECTORY_SIGNATURE);

    const eocdOffset = bytes.length - 22;
    expect(view.getUint32(eocdOffset, true)).toBe(END_OF_CENTRAL_DIRECTORY_SIGNATURE);
    expect(view.getUint16(eocdOffset + 8, true)).toBe(entries.size);
    expect(view.getUint16(eocdOffset + 10, true)).toBe(entries.size);
    expect(view.getUint32(eocdOffset + 16, true)).toBe(centralDirectoryOffset);
    // セントラルディレクトリのサイズが EOCD の直前までと一致する
    expect(view.getUint32(eocdOffset + 12, true)).toBe(eocdOffset - centralDirectoryOffset);
  });

  it("シート名と各セルの値を書き込む", () => {
    const { entries } = readZipEntries(buildXlsx(rows, { sheetName: "報告内容" }));
    const workbook = entries.get("xl/workbook.xml") ?? "";
    const sheet = entries.get("xl/worksheets/sheet1.xml") ?? "";

    expect(workbook).toContain('<sheet name="報告内容" sheetId="1" r:id="rId1"/>');
    expect(sheet).toContain('<t xml:space="preserve">日付</t>');
    expect(sheet).toContain('<t xml:space="preserve">浅井 元輝</t>');
    // 数値は inlineStr ではなく数値セルとして書く
    expect(sheet).toContain('<c r="C3" s="2"><v>12345</v></c>');
  });

  it("XML の特殊文字をエスケープする", () => {
    const { entries } = readZipEntries(buildXlsx(rows));
    const sheet = entries.get("xl/worksheets/sheet1.xml") ?? "";

    expect(sheet).toContain("A &amp; B &lt;c&gt; &quot;d&quot;");
  });

  it("XML で表現できない制御文字を落とし、改行は残す", () => {
    const { entries } = readZipEntries(buildXlsx([["見出し"], ["1行目\u00012行目\n3行目"]]));
    const sheet = entries.get("xl/worksheets/sheet1.xml") ?? "";

    expect(sheet).toContain('<t xml:space="preserve">1行目2行目\n3行目</t>');
  });

  it("空セルは値なしのセルとして書く", () => {
    const { entries } = readZipEntries(buildXlsx([["見出し"], [""], [null]]));
    const sheet = entries.get("xl/worksheets/sheet1.xml") ?? "";

    expect(sheet).toContain('<c r="A2" s="0"/>');
    expect(sheet).toContain('<c r="A3" s="0"/>');
  });

  it("行が空でも壊れないブックを作る", () => {
    const { entries } = readZipEntries(buildXlsx([]));
    const sheet = entries.get("xl/worksheets/sheet1.xml") ?? "";

    expect(sheet).toContain("<sheetData></sheetData>");
    expect(sheet).not.toContain("<cols>");
  });
});
