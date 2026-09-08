import type { CsvCell } from "./csv";

export type XlsxCell = CsvCell;

export type XlsxOptions = {
  /** シート名。Excel の制約に合わせて 31 文字まで／禁止文字は "_" に置換する */
  sheetName?: string;
  /** 先頭行を見出し行として扱うか */
  headerRow?: boolean;
};

const DEFAULT_SHEET_NAME = "Sheet1";
const MIN_COLUMN_WIDTH = 10;
const MAX_COLUMN_WIDTH = 60;

const STYLE_DEFAULT = 0;
const STYLE_HEADER = 1;
const STYLE_BODY = 2;

const textEncoder = new TextEncoder();

/** XML 1.0 で表現できない制御文字を除去する */
function stripInvalidXmlChars(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

function escapeXml(value: string) {
  return stripInvalidXmlChars(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** 0 始まりの列番号を A1 形式の列名（A, B, ... Z, AA, ...）に変換する */
export function toColumnName(columnIndex: number) {
  let name = "";
  let cursor = columnIndex;

  while (cursor >= 0) {
    name = String.fromCharCode((cursor % 26) + 65) + name;
    cursor = Math.floor(cursor / 26) - 1;
  }

  return name;
}

/** Excel のシート名制約（31 文字以内・記号不可・空不可）に丸める */
export function normalizeSheetName(sheetName: string | undefined) {
  const normalized = (sheetName ?? "").replace(/[\\/:*?[\]]/g, "_").trim();

  return normalized ? normalized.slice(0, 31) : DEFAULT_SHEET_NAME;
}

function isNumericCell(value: XlsxCell): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** 表示幅の目安。全角は 2 文字分として数える */
function getDisplayWidth(value: string) {
  let width = 0;

  for (const char of value) {
    width += /[\u0020-\u00FF\uFF61-\uFF9F]/.test(char) ? 1 : 2;
  }

  return width;
}

function toCellText(value: XlsxCell) {
  return value == null ? "" : String(value);
}

function buildColumnWidths(rows: XlsxCell[][]) {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);
  const widths: number[] = [];

  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    let width = MIN_COLUMN_WIDTH;

    for (const row of rows) {
      // 改行を含むセルは折り返して表示されるため、最長行だけを幅の根拠にする
      for (const line of toCellText(row[columnIndex]).split("\n")) {
        width = Math.max(width, getDisplayWidth(line) + 2);
      }
    }

    widths.push(Math.min(MAX_COLUMN_WIDTH, width));
  }

  return widths;
}

function buildSheetXml(rows: XlsxCell[][], headerRow: boolean) {
  const widths = buildColumnWidths(rows);
  const cols = widths.length
    ? `<cols>${widths
        .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
        .join("")}</cols>`
    : "";
  const sheetRows = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const isHeaderRow = headerRow && rowIndex === 0;
      const cells = row
        .map((cell, columnIndex) => {
          const reference = `${toColumnName(columnIndex)}${rowNumber}`;

          if (isNumericCell(cell)) {
            return `<c r="${reference}" s="${isHeaderRow ? STYLE_HEADER : STYLE_BODY}"><v>${cell}</v></c>`;
          }

          const text = toCellText(cell);
          const styleIndex = isHeaderRow ? STYLE_HEADER : text ? STYLE_BODY : STYLE_DEFAULT;

          if (!text) {
            return `<c r="${reference}" s="${styleIndex}"/>`;
          }

          return `<c r="${reference}" s="${styleIndex}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");
  // 見出し行があるときはスクロールしても見出しが残るように固定する
  const sheetViews =
    headerRow && rows.length > 1
      ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sheetViews}${cols}<sheetData>${sheetRows}</sheetData></worksheet>`;
}

function buildWorkbookXml(sheetName: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

// cellXfs の並びが STYLE_DEFAULT / STYLE_HEADER / STYLE_BODY に対応している
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><color rgb="FF000000"/><name val="Yu Gothic"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF000000"/><name val="Yu Gothic"/><family val="2"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

let crcTable: Uint32Array | null = null;

function getCrcTable() {
  if (crcTable) {
    return crcTable;
  }

  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  crcTable = table;

  return table;
}

function crc32(bytes: Uint8Array) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (let index = 0; index < bytes.length; index += 1) {
    crc = table[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = {
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  localHeaderOffset: number;
};

/**
 * 無圧縮（store）の ZIP を組み立てる。
 * xlsx は ZIP コンテナなので、これだけで Excel が開けるブックになる。
 */
function buildZip(files: { name: string; content: string }[]) {
  const entries: ZipEntry[] = [];
  let localSectionSize = 0;
  let centralSectionSize = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const data = textEncoder.encode(file.content);

    entries.push({ nameBytes, data, crc: crc32(data), localHeaderOffset: localSectionSize });
    localSectionSize += 30 + nameBytes.length + data.length;
    centralSectionSize += 46 + nameBytes.length;
  }

  const buffer = new ArrayBuffer(localSectionSize + centralSectionSize + 22);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  for (const entry of entries) {
    view.setUint32(offset, 0x04034b50, true); // local file header signature
    view.setUint16(offset + 4, 20, true); // version needed to extract
    view.setUint16(offset + 6, 0x0800, true); // general purpose flag (UTF-8 file name)
    view.setUint16(offset + 8, 0, true); // compression method: store
    view.setUint16(offset + 10, 0, true); // last modified time
    view.setUint16(offset + 12, 0x0021, true); // last modified date (1980-01-01)
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.data.length, true); // compressed size
    view.setUint32(offset + 22, entry.data.length, true); // uncompressed size
    view.setUint16(offset + 26, entry.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true); // extra field length
    offset += 30;
    bytes.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
    bytes.set(entry.data, offset);
    offset += entry.data.length;
  }

  const centralDirectoryOffset = offset;

  for (const entry of entries) {
    view.setUint32(offset, 0x02014b50, true); // central directory header signature
    view.setUint16(offset + 4, 20, true); // version made by
    view.setUint16(offset + 6, 20, true); // version needed to extract
    view.setUint16(offset + 8, 0x0800, true); // general purpose flag (UTF-8 file name)
    view.setUint16(offset + 10, 0, true); // compression method: store
    view.setUint16(offset + 12, 0, true); // last modified time
    view.setUint16(offset + 14, 0x0021, true); // last modified date (1980-01-01)
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.data.length, true); // compressed size
    view.setUint32(offset + 24, entry.data.length, true); // uncompressed size
    view.setUint16(offset + 28, entry.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true); // extra field length
    view.setUint16(offset + 32, 0, true); // file comment length
    view.setUint16(offset + 34, 0, true); // disk number start
    view.setUint16(offset + 36, 0, true); // internal file attributes
    view.setUint32(offset + 38, 0, true); // external file attributes
    view.setUint32(offset + 42, entry.localHeaderOffset, true);
    offset += 46;
    bytes.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
  }

  view.setUint32(offset, 0x06054b50, true); // end of central directory signature
  view.setUint16(offset + 4, 0, true); // number of this disk
  view.setUint16(offset + 6, 0, true); // disk where central directory starts
  view.setUint16(offset + 8, entries.length, true); // central directory records on this disk
  view.setUint16(offset + 10, entries.length, true); // total central directory records
  view.setUint32(offset + 12, centralSectionSize, true);
  view.setUint32(offset + 16, centralDirectoryOffset, true);
  view.setUint16(offset + 20, 0, true); // comment length

  return bytes;
}

/** 行データから xlsx（Excel ブック）のバイト列を組み立てる */
export function buildXlsx(rows: XlsxCell[][], options?: XlsxOptions) {
  const sheetName = normalizeSheetName(options?.sheetName);
  const headerRow = options?.headerRow ?? true;

  return buildZip([
    { name: "[Content_Types].xml", content: CONTENT_TYPES_XML },
    { name: "_rels/.rels", content: ROOT_RELS_XML },
    { name: "xl/workbook.xml", content: buildWorkbookXml(sheetName) },
    { name: "xl/_rels/workbook.xml.rels", content: WORKBOOK_RELS_XML },
    { name: "xl/styles.xml", content: STYLES_XML },
    { name: "xl/worksheets/sheet1.xml", content: buildSheetXml(rows, headerRow) },
  ]);
}

export const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** 行データを xlsx としてブラウザにダウンロードさせる */
export function downloadExcel(filename: string, rows: XlsxCell[][], options?: XlsxOptions) {
  const blob = new Blob([buildXlsx(rows, options)], { type: XLSX_MIME_TYPE });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  window.URL.revokeObjectURL(url);
}
