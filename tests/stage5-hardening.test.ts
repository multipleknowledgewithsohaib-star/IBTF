import assert from "node:assert/strict";
import test from "node:test";
import { strToU8, zipSync } from "fflate";
import { assertEligibleComposition } from "../lib/payment-controls.ts";
import { assertProcessedCaseTransition, matchConfirmation, type CandidateBatch, type ConfirmationRecord } from "../lib/reconciliation-controls.ts";
import { parsePkrPaisa, validateManifestTable } from "../lib/intake.ts";
import { decodeBiffSstSegments, excelSerialDate, normalizeSpreadsheetDate, parseSpreadsheet, parseXlsx, SpreadsheetError, validateXlsxContainer } from "../lib/spreadsheet.ts";

const workbook = (sheetXml:string, options:{date1904?:boolean;name?:string;shared?:string}={}) => zipSync({
  "[Content_Types].xml":strToU8("<Types/>"),
  "xl/workbook.xml":strToU8(`<workbook><workbookPr date1904="${options.date1904?1:0}"/><sheets><sheet name="${options.name??"Manifest"}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
  "xl/_rels/workbook.xml.rels":strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
  "xl/worksheets/sheet1.xml":strToU8(`<worksheet><sheetData>${sheetXml}</sheetData></worksheet>`),
  ...(options.shared?{"xl/sharedStrings.xml":strToU8(options.shared)}:{}),
});
const rows=(values:string[][])=>values.map((row,r)=>`<row r="${r+1}">${row.map((v,c)=>`<c r="${String.fromCharCode(65+c)}${r+1}" t="inlineStr"><is><t>${v}</t></is></c>`).join("")}</row>`).join("");
const header=["Case No","Booking ID","Embassy","Location","Booking Date","Reporting Date","Amount"];
const candidate:CandidateBatch={id:"batch-1",status:"Sent to Bank",batchReference:"IBFT-1",embassyReference:"ITALY",vacReference:"ISB",beneficiaryName:"Consulate of Italy",beneficiaryAccount:"PK18",payableAmountPaisa:10000,paymentProcessingDate:"2026-09-11"};
const confirmation:ConfirmationRecord={bankReference:"SCB-1",paymentDate:"2026-09-11",beneficiaryName:"Consulate of Italy",beneficiaryAccount:"PK18",paidAmountPaisa:10000,embassyReference:"ITALY",vacReference:"ISB"};

test("PKR prefix and thousands separators normalize to paisa",()=>assert.equal(parsePkrPaisa("PKR 30,000.25"),3000025));
test("ambiguous decimal precision is rejected",()=>assert.equal(parsePkrPaisa("PKR 1.001"),null));
test("negative PKR amounts are rejected",()=>assert.equal(parsePkrPaisa("PKR -1"),null));
test("canonical manifest table accepts controlled text dates",()=>assert.equal(validateManifestTable([header,["C1","B1","ITALY","ISB","2026-09-01","2026-09-02","PKR 1,000.00"]]).valid,true));
test("1900 serial one is 1900-01-01",()=>assert.equal(excelSerialDate(1),"1900-01-01"));
test("1900 leap-year defect is normalized deterministically",()=>assert.equal(excelSerialDate(60),"1900-02-28"));
test("serial 61 remains 1900-03-01",()=>assert.equal(excelSerialDate(61),"1900-03-01"));
test("date1904 serial zero is 1904-01-01",()=>assert.equal(excelSerialDate(0,true),"1904-01-01"));
test("fractional serial uses its calendar day",()=>assert.equal(excelSerialDate(46275.75),"2026-09-10"));
test("excessive serial is rejected",()=>assert.throws(()=>excelSerialDate(3_000_000),SpreadsheetError));
test("DD/MM/YYYY text dates normalize without locale guessing",()=>assert.equal(normalizeSpreadsheetDate({value:"11/09/2026"},false),"2026-09-11"));
test("invalid text calendar date is rejected",()=>assert.throws(()=>normalizeSpreadsheetDate({value:"31/02/2026"},false),SpreadsheetError));
test("XLSX central directory is accepted before decompression",()=>assert.doesNotThrow(()=>validateXlsxContainer(workbook(rows([header])))));
test("non-ZIP bytes have a controlled directory error",()=>assert.throws(()=>validateXlsxContainer(strToU8("not zip")),(e:unknown)=>e instanceof SpreadsheetError&&e.code==="XLSX_ZIP_DIRECTORY_INVALID"));
test("canonical worksheet name is retained",()=>assert.equal(parseXlsx(workbook(rows([header]),{name:"Visa Manifest"})).worksheet,"Visa Manifest"));
test("XLSX date1904 flag is retained",()=>assert.equal(parseXlsx(workbook(rows([header]),{date1904:true})).date1904,true));
test("inline spreadsheet cells are resolved",()=>assert.equal(parseXlsx(workbook(rows([header,["C1"]]))).rows[1][0].value,"C1"));
test("shared strings resolve by exact index",()=>{const xml='<row r="1"><c r="A1" t="s"><v>1</v></c></row>';const shared='<sst><si><t>wrong</t></si><si><r><t>Case</t></r><r><t> No</t></r></si></sst>';assert.equal(parseXlsx(workbook(xml,{shared})).rows[0][0].value,"Case No")});
test("invalid shared string index is rejected",()=>{const xml='<row r="1"><c r="A1" t="s"><v>2</v></c></row>';assert.throws(()=>parseXlsx(workbook(xml,{shared:'<sst><si><t>only</t></si></sst>'})),SpreadsheetError)});
test("formula cached values are rejected",()=>{const xml='<row r="1"><c r="A1"><f>1+1</f><v>2</v></c></row>';assert.throws(()=>parseXlsx(workbook(xml)),(e:unknown)=>e instanceof SpreadsheetError&&e.code==="XLSX_FORMULA_CACHED_VALUE")});
test("numeric cells preserve numeric identity",()=>{const xml='<row r="1"><c r="A1"><v>46276</v></c></row>';assert.equal(parseXlsx(workbook(xml)).rows[0][0].numeric,46276)});
test("extension selects XLSX parser",()=>assert.equal(parseSpreadsheet(workbook(rows([header])),"safe.xlsx").worksheet,"Manifest"));
test("unsupported spreadsheet extension is rejected",()=>assert.throws(()=>parseSpreadsheet(new Uint8Array(),"safe.csv"),SpreadsheetError));
test("BIFF SST decodes compressed strings",()=>{const segment=Uint8Array.from([1,0,0,0,1,0,0,0,3,0,0,65,66,67]);assert.deepEqual(decodeBiffSstSegments([segment]),["ABC"])});
test("BIFF SST decodes UTF-16 strings",()=>{const segment=Uint8Array.from([1,0,0,0,1,0,0,0,2,0,1,65,0,66,0]);assert.deepEqual(decodeBiffSstSegments([segment]),["AB"])});
test("BIFF SST requires continuation encoding transition",()=>{const first=Uint8Array.from([1,0,0,0,1,0,0,0,3,0,0,65]),next=Uint8Array.from([]);assert.throws(()=>decodeBiffSstSegments([first,next]),SpreadsheetError)});
test("BIFF SST accepts compressed continuation transition",()=>{const first=Uint8Array.from([1,0,0,0,1,0,0,0,3,0,0,65]),next=Uint8Array.from([0,66,67]);assert.deepEqual(decodeBiffSstSegments([first,next]),["ABC"])});
test("BIFF SST rejects reserved string flags",()=>{const segment=Uint8Array.from([1,0,0,0,1,0,0,0,1,0,0x80,65]);assert.throws(()=>decodeBiffSstSegments([segment]),SpreadsheetError)});
test("amount mismatch preserves unique batch and paisa variance",()=>assert.deepEqual(matchConfirmation({...confirmation,paidAmountPaisa:10500},[candidate]),{outcome:"Amount Mismatch",batchId:"batch-1",expectedAmountPaisa:10000,variancePaisa:500}));
test("exact match stores expected amount and zero variance",()=>assert.deepEqual(matchConfirmation(confirmation,[candidate]),{outcome:"Matched",batchId:"batch-1",expectedAmountPaisa:10000,variancePaisa:0}));
test("multiple mismatch candidates do not select a batch",()=>{const result=matchConfirmation({...confirmation,paidAmountPaisa:1},[candidate,{...candidate,id:"batch-2"}]);assert.equal(result.batchId,undefined);assert.deepEqual(result.candidates,["batch-1","batch-2"])});
test("processed case may enter exception only after approval",()=>assert.doesNotThrow(()=>assertProcessedCaseTransition("Processed Successfully","Reconciliation Exception",true)));
test("processed case cannot be edited",()=>assert.throws(()=>assertProcessedCaseTransition("Processed Successfully","Eligible for Payment",true),/PROCESSED_CASE_LOCKED/));
test("processed case cannot enter exception without approval",()=>assert.throws(()=>assertProcessedCaseTransition("Processed Successfully","Reconciliation Exception",false),/PROCESSED_CASE_LOCKED/));
test("server rejects zero-amount payable selection",()=>assert.throws(()=>assertEligibleComposition([{id:"zero",status:"Eligible for Payment",embassyId:"it",vacId:"isb",bookingDate:new Date(),visaFeePaisa:0}],"it","isb"),/zero payable amount/));
