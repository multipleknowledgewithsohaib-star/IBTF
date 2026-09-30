import { unzipSync } from "fflate";

export class SpreadsheetError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type SpreadsheetCell = { value: string; numeric?: number; formula?: boolean };
export type SpreadsheetTable = { worksheet: string; date1904: boolean; rows: SpreadsheetCell[][] };

const LIMITS = { entries: 128, compressed: 10 * 1024 * 1024, expanded: 32 * 1024 * 1024, ratio: 100, rows: 25_000, columns: 128, strings: 100_000, stringChars: 1_000_000, records: 250_000, allocation: 32 * 1024 * 1024 } as const;
const decoder = new TextDecoder();
const u16 = (b: Uint8Array, p: number) => b[p]! | (b[p + 1]! << 8);
const u32 = (b: Uint8Array, p: number) => (b[p]! | (b[p + 1]! << 8) | (b[p + 2]! << 16) | (b[p + 3]! << 24)) >>> 0;
const escapeXml = (value: string) => value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const column = (ref: string) => [...ref.replace(/\d/g, "")].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Validate central-directory sizes before fflate is allowed to allocate output. */
export function validateXlsxContainer(bytes: Uint8Array): void {
  let eocd = -1;
  for (let p = bytes.length - 22; p >= Math.max(0, bytes.length - 65_557); p--) if (u32(bytes, p) === 0x06054b50) { eocd = p; break; }
  if (eocd < 0) throw new SpreadsheetError("XLSX_ZIP_DIRECTORY_INVALID", "ZIP end-of-central-directory record is missing.");
  const count = u16(bytes, eocd + 10), size = u32(bytes, eocd + 12), start = u32(bytes, eocd + 16);
  if (count > LIMITS.entries || start + size > eocd) throw new SpreadsheetError("XLSX_ZIP_LIMIT_EXCEEDED", "XLSX ZIP directory exceeds controlled limits.");
  let p = start, compressed = 0, expanded = 0; const names = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (u32(bytes, p) !== 0x02014b50 || p + 46 > bytes.length) throw new SpreadsheetError("XLSX_ZIP_DIRECTORY_INVALID", "Malformed ZIP central directory.");
    const flags = u16(bytes, p + 8), packed = u32(bytes, p + 20), unpacked = u32(bytes, p + 24), nameLength = u16(bytes, p + 28), extra = u16(bytes, p + 30), comment = u16(bytes, p + 32);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLength));
    if ((flags & 1) !== 0) throw new SpreadsheetError("XLSX_ZIP_ENCRYPTED", "Encrypted XLSX entries are not accepted.");
    if (!name || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..") || names.has(name)) throw new SpreadsheetError("XLSX_ZIP_ENTRY_INVALID", "XLSX contains an unsafe or duplicate ZIP entry.");
    names.add(name); compressed += packed; expanded += unpacked;
    if (packed === 0 && unpacked > 0 || packed > 0 && unpacked / packed > LIMITS.ratio) throw new SpreadsheetError("XLSX_ZIP_RATIO_EXCEEDED", "XLSX entry expansion ratio exceeds the controlled limit.");
    p += 46 + nameLength + extra + comment;
  }
  if (p !== start + size || compressed > LIMITS.compressed || expanded > LIMITS.expanded) throw new SpreadsheetError("XLSX_ZIP_LIMIT_EXCEEDED", "XLSX compressed or expanded size exceeds controlled limits.");
}

function xmlPart(files: Record<string, Uint8Array>, name: string, required = true): string {
  const value = files[name];
  if (!value) { if (required) throw new SpreadsheetError("XLSX_PART_MISSING", `Required XLSX part ${name} is missing.`); return ""; }
  return decoder.decode(value);
}

function relationshipTarget(workbook: string, relationships: string, preferredNames: readonly string[]): { name: string; target: string } {
  const rels = new Map([...relationships.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/?\s*>/g)].map((m) => [m[1], m[2]]));
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*(?:r:id|id)="([^"]+)"[^>]*\/?\s*>/g)].map((m) => ({ name: escapeXml(m[1]), target: rels.get(m[2]) }));
  if (!sheets.length) throw new SpreadsheetError("XLSX_NO_WORKSHEET", "XLSX contains no declared worksheet.");
  const canonical = sheets.find((s) => preferredNames.some((n) => s.name.trim().toLowerCase() === n.trim().toLowerCase())) ?? sheets[0];
  if (!canonical.target || /^\w+:|^\/|\.\./.test(canonical.target)) throw new SpreadsheetError("XLSX_RELATIONSHIP_INVALID", "Worksheet relationship target is unsafe or missing.");
  return { name: canonical.name, target: `xl/${canonical.target.replace(/^\.\//, "")}`.replace("xl/xl/", "xl/") };
}

export function parseXlsx(bytes: Uint8Array, preferredNames: readonly string[] = ["Manifest", "Visa Manifest", "Sheet1"]): SpreadsheetTable {
  validateXlsxContainer(bytes);
  let files: Record<string, Uint8Array>; try { files = unzipSync(bytes); } catch { throw new SpreadsheetError("XLSX_DECOMPRESSION_FAILED", "XLSX could not be safely decompressed."); }
  const workbook = xmlPart(files, "xl/workbook.xml"), relationships = xmlPart(files, "xl/_rels/workbook.xml.rels");
  const selected = relationshipTarget(workbook, relationships, preferredNames), sharedXml = xmlPart(files, "xl/sharedStrings.xml", false);
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => escapeXml([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  if (shared.length > LIMITS.strings || shared.reduce((n, s) => n + s.length, 0) > LIMITS.stringChars) throw new SpreadsheetError("XLSX_SHARED_STRINGS_LIMIT", "Shared strings exceed controlled limits.");
  const sheet = xmlPart(files, selected.target), rows: SpreadsheetCell[][] = [];
  for (const match of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    if (rows.length >= LIMITS.rows) throw new SpreadsheetError("SPREADSHEET_ROW_LIMIT", "Worksheet row limit exceeded.");
    const row: SpreadsheetCell[] = [];
    for (const cell of match[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cell[1], body = cell[2], ref = attrs.match(/\br="([A-Z]+\d+)"/)?.[1], type = attrs.match(/\bt="([^"]+)"/)?.[1];
      if (!ref) throw new SpreadsheetError("XLSX_CELL_REFERENCE_INVALID", "A worksheet cell has no canonical reference.");
      const index = column(ref); if (index < 0 || index >= LIMITS.columns) throw new SpreadsheetError("SPREADSHEET_COLUMN_LIMIT", "Worksheet column limit exceeded.");
      const formula = /<f(?:\s[^>]*)?>[\s\S]*?<\/f>/.test(body), raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
      if (formula && raw !== "") throw new SpreadsheetError("XLSX_FORMULA_CACHED_VALUE", "Formula cells with cached values are rejected as non-authoritative.");
      let value = escapeXml(raw); if (type === "s") { const n = Number(raw); if (!Number.isInteger(n) || n < 0 || n >= shared.length) throw new SpreadsheetError("XLSX_SHARED_STRING_INVALID", "Shared-string index is invalid."); value = shared[n]; }
      row[index] = { value, ...(type === undefined && value !== "" && Number.isFinite(Number(value)) ? { numeric: Number(value) } : {}), ...(formula ? { formula: true } : {}) };
    }
    if (row.some((c) => c?.value !== "")) rows.push(row);
  }
  return { worksheet: selected.name, date1904: /<workbookPr\b[^>]*date1904="(?:1|true)"/i.test(workbook), rows };
}

export function excelSerialDate(serial: number, date1904 = false): string {
  if (!Number.isFinite(serial) || serial < 0 || serial > 2_958_465) throw new SpreadsheetError("INVALID_EXCEL_DATE", "Excel date serial is outside the supported range.");
  const whole = Math.floor(serial); // Excel's fictitious 1900-02-29 is deliberately collapsed.
  const days = date1904 ? whole : whole - (whole >= 60 ? 1 : 0);
  const epoch = Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 31);
  const date = new Date(epoch + days * 86_400_000);
  if (Number.isNaN(date.valueOf())) throw new SpreadsheetError("INVALID_EXCEL_DATE", "Excel date serial is invalid.");
  return date.toISOString().slice(0, 10);
}

export function normalizeSpreadsheetDate(cell: SpreadsheetCell, date1904: boolean): string {
  if (cell.numeric !== undefined) return excelSerialDate(cell.numeric, date1904);
  const value = cell.value.trim(); let m: RegExpMatchArray | null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return validDate(value);
  if ((m = value.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/))) return validDate(`${m[3]}-${m[2]}-${m[1]}`);
  throw new SpreadsheetError("INVALID_SPREADSHEET_DATE", "Date must be an Excel serial, YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY.");
}
function validDate(value: string): string { const d = new Date(`${value}T00:00:00Z`); if (Number.isNaN(d.valueOf()) || d.toISOString().slice(0, 10) !== value) throw new SpreadsheetError("INVALID_SPREADSHEET_DATE", "Date is not a real calendar date."); return value; }

function rkNumber(value: number): number {
  const divided = (value & 1) !== 0, integer = (value & 2) !== 0;
  let result: number;
  if (integer) result = value >> 2;
  else { const buffer = new ArrayBuffer(8), view = new DataView(buffer); view.setUint32(0, 0, true); view.setUint32(4, value & 0xfffffffc, true); result = view.getFloat64(0, true); }
  return divided ? result / 100 : result;
}

/** Decode BIFF8 SST payloads while treating every CONTINUE boundary as structural. */
export function decodeBiffSstSegments(segments: readonly Uint8Array[]): string[] {
  if (!segments.length || segments[0].length < 8) throw new SpreadsheetError("XLS_SST_MALFORMED", "SST header is truncated.");
  let segment = 0, offset = 8, strings = 0, characters = 0;
  const unique = u32(segments[0], 4), output: string[] = [];
  if (unique > LIMITS.strings) throw new SpreadsheetError("XLS_SST_LIMIT", "SST string count exceeds the controlled limit.");
  const readByte = (continuingCharacters = false): number => {
    while (offset >= (segments[segment]?.length ?? 0)) { segment++; offset = 0; if (!segments[segment]) throw new SpreadsheetError("XLS_SST_MALFORMED", "SST terminates unexpectedly."); if (continuingCharacters) throw new SpreadsheetError("XLS_SST_TRANSITION_REQUIRED", "SST character continuation is missing its encoding transition byte."); }
    return segments[segment]![offset++]!;
  };
  const readLe = (count: number) => { let n = 0; for (let i = 0; i < count; i++) n += readByte() * 2 ** (8 * i); return n; };
  while (strings < unique) {
    const length = readLe(2), flags = readByte(), rich = (flags & 8) !== 0, extended = (flags & 4) !== 0;
    if ((flags & 0xf2) !== 0) throw new SpreadsheetError("XLS_SST_MALFORMED", "SST uses unsupported reserved flags.");
    const runs = rich ? readLe(2) : 0, extension = extended ? readLe(4) : 0;
    characters += length; if (characters > LIMITS.stringChars || runs > length + 1 || extension > LIMITS.allocation) throw new SpreadsheetError("XLS_SST_LIMIT", "SST allocation exceeds controlled limits.");
    let wide = (flags & 1) !== 0, value = "";
    for (let i = 0; i < length; i++) {
      if (offset >= segments[segment]!.length) { segment++; offset = 0; const next = segments[segment]; if (!next?.length) throw new SpreadsheetError("XLS_SST_MALFORMED", "SST character data is truncated."); const transition = next[offset++]!; if ((transition & 0xfe) !== 0) throw new SpreadsheetError("XLS_SST_TRANSITION_INVALID", "SST CONTINUE encoding transition is invalid."); wide = (transition & 1) !== 0; }
      const code = wide ? readByte() | (readByte(true) << 8) : readByte(); value += String.fromCharCode(code);
    }
    for (let i = 0; i < runs * 4 + extension; i++) readByte();
    output.push(value); strings++;
  }
  return output;
}

function workbookStream(bytes: Uint8Array): Uint8Array {
  const signature = "d0cf11e0a1b11ae1";
  if ([...bytes.subarray(0, 8)].map((v) => v.toString(16).padStart(2, "0")).join("") !== signature) throw new SpreadsheetError("XLS_OLE_INVALID", "XLS OLE signature is missing.");
  const sectorSize = 1 << u16(bytes, 30), miniSize = 1 << u16(bytes, 32), fatCount = u32(bytes, 44), directoryStart = u32(bytes, 48), miniCutoff = u32(bytes, 56), miniFatStart = u32(bytes, 60), miniFatCount = u32(bytes, 64);
  if (sectorSize !== 512 && sectorSize !== 4096 || miniSize !== 64 || fatCount > 256 || bytes.length > LIMITS.allocation) throw new SpreadsheetError("XLS_OLE_LIMIT", "XLS compound-document allocation is unsupported or excessive.");
  const sector = (id: number) => { const start = (id + 1) * sectorSize; if (id >= 0xfffffffa || start + sectorSize > bytes.length) throw new SpreadsheetError("XLS_OLE_MALFORMED", "OLE sector chain is invalid."); return bytes.subarray(start, start + sectorSize); };
  const difat: number[] = []; for (let p = 76; p < 512 && difat.length < fatCount; p += 4) { const id = u32(bytes, p); if (id < 0xfffffffa) difat.push(id); }
  if (difat.length !== fatCount) throw new SpreadsheetError("XLS_OLE_LIMIT", "Extended DIFAT chains are not accepted.");
  const fat = difat.flatMap((id) => { const s = sector(id), out: number[] = []; for (let p = 0; p < s.length; p += 4) out.push(u32(s, p)); return out; });
  const chain = (start: number, table = fat, unit = sectorSize, source?: Uint8Array) => { const chunks: Uint8Array[] = [], seen = new Set<number>(); let id = start, total = 0; while (id < 0xfffffffa) { if (seen.has(id) || id >= table.length || ++total > LIMITS.records) throw new SpreadsheetError("XLS_OLE_MALFORMED", "OLE sector chain loops or exceeds limits."); seen.add(id); chunks.push(source ? source.subarray(id * unit, id * unit + unit) : sector(id)); id = table[id]!; } const result = new Uint8Array(chunks.length * unit); chunks.forEach((c, i) => result.set(c, i * unit)); return result; };
  const directory = chain(directoryStart), entries: { name: string; start: number; size: number; type: number }[] = [];
  for (let p = 0; p + 128 <= directory.length; p += 128) { const length = u16(directory, p + 64), type = directory[p + 66]!; if (length < 2 || length > 64 || length % 2) continue; let name = ""; for (let q = p; q < p + length - 2; q += 2) name += String.fromCharCode(u16(directory, q)); entries.push({ name, type, start: u32(directory, p + 116), size: u32(directory, p + 120) }); }
  const book = entries.find((e) => e.type === 2 && /^(Workbook|Book)$/i.test(e.name)), root = entries.find((e) => e.type === 5);
  if (!book || book.size > LIMITS.allocation) throw new SpreadsheetError("XLS_WORKBOOK_MISSING", "BIFF workbook stream is missing or excessive.");
  if (book.size >= miniCutoff) return chain(book.start).subarray(0, book.size);
  if (!root || miniFatCount > 128) throw new SpreadsheetError("XLS_OLE_MALFORMED", "OLE mini stream metadata is invalid.");
  const miniFatBytes = chain(miniFatStart), miniFat: number[] = []; for (let p = 0; p < miniFatCount * sectorSize; p += 4) miniFat.push(u32(miniFatBytes, p));
  return chain(book.start, miniFat, miniSize, chain(root.start).subarray(0, root.size)).subarray(0, book.size);
}

export function parseXls(bytes: Uint8Array, preferredNames: readonly string[] = ["Manifest", "Visa Manifest", "Sheet1"]): SpreadsheetTable {
  const stream = workbookStream(bytes), records: { id: number; offset: number; data: Uint8Array }[] = [];
  for (let p = 0; p + 4 <= stream.length;) { if (records.length >= LIMITS.records) throw new SpreadsheetError("XLS_RECORD_LIMIT", "BIFF record limit exceeded."); const id = u16(stream, p), length = u16(stream, p + 2); if (p + 4 + length > stream.length) throw new SpreadsheetError("XLS_RECORD_MALFORMED", "BIFF record is truncated."); records.push({ id, offset: p, data: stream.subarray(p + 4, p + 4 + length) }); p += 4 + length; }
  const bounds: { offset: number; name: string }[] = []; let date1904 = false, sst: string[] = [];
  for (let i = 0; i < records.length; i++) { const r = records[i]; if (r.id === 0x0022 && r.data.length >= 2) date1904 = u16(r.data, 0) === 1; if (r.id === 0x0085 && r.data.length >= 8) { const length = r.data[6]!, wide = (r.data[7]! & 1) !== 0, start = 8, name = wide ? new TextDecoder("utf-16le").decode(r.data.subarray(start, start + length * 2)) : new TextDecoder("windows-1252").decode(r.data.subarray(start, start + length)); bounds.push({ offset: u32(r.data, 0), name }); } if (r.id === 0x00fc) { const parts = [r.data]; while (records[i + 1]?.id === 0x003c) parts.push(records[++i].data); sst = decodeBiffSstSegments(parts); } }
  if (!bounds.length) throw new SpreadsheetError("XLS_NO_WORKSHEET", "BIFF workbook contains no worksheet.");
  const selected = bounds.find((s) => preferredNames.some((n) => n.toLowerCase() === s.name.toLowerCase())) ?? bounds[0], rows: SpreadsheetCell[][] = [];
  const set = (row: number, col: number, cell: SpreadsheetCell) => { if (row >= LIMITS.rows || col >= LIMITS.columns) throw new SpreadsheetError("SPREADSHEET_DIMENSION_LIMIT", "BIFF worksheet dimensions exceed limits."); (rows[row] ??= [])[col] = cell; };
  for (const r of records.filter((item) => item.offset >= selected.offset)) { const d = r.data; if (r.id === 0x000a) break; if (r.id === 0x00fd && d.length >= 10) { const index = u32(d, 6); if (sst[index] === undefined) throw new SpreadsheetError("XLS_SST_INDEX_INVALID", "BIFF shared-string index is invalid."); set(u16(d, 0), u16(d, 2), { value: sst[index] }); } else if (r.id === 0x0203 && d.length >= 14) { const n = new DataView(d.buffer, d.byteOffset + 6, 8).getFloat64(0, true); set(u16(d, 0), u16(d, 2), { value: String(n), numeric: n }); } else if (r.id === 0x027e && d.length >= 10) { const n = rkNumber(u32(d, 6)); set(u16(d, 0), u16(d, 2), { value: String(n), numeric: n }); } else if (r.id === 0x00bd && d.length >= 10) { const row = u16(d, 0), first = u16(d, 2), last = u16(d, d.length - 2); if (last < first || d.length !== 6 + (last - first + 1) * 6) throw new SpreadsheetError("XLS_MULRK_MALFORMED", "MULRK record is malformed."); for (let c = first; c <= last; c++) { const n = rkNumber(u32(d, 6 + (c - first) * 6)); set(row, c, { value: String(n), numeric: n }); } } else if (r.id === 0x0006) throw new SpreadsheetError("XLS_FORMULA_CACHED_VALUE", "BIFF formula results are rejected as non-authoritative."); }
  return { worksheet: selected.name, date1904, rows: rows.filter((r) => r?.some((c) => c?.value !== "")) };
}

export function parseSpreadsheet(bytes: Uint8Array, fileName: string, preferredNames?: readonly string[]): SpreadsheetTable {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".xlsx")) return parseXlsx(bytes, preferredNames);
  if (lower.endsWith(".xls")) return parseXls(bytes, preferredNames);
  throw new SpreadsheetError("SPREADSHEET_FORMAT_UNSUPPORTED", "Only XLSX and BIFF8 XLS workbooks are supported.");
}
