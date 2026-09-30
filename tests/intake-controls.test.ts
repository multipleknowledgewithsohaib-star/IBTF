import test from "node:test"; import assert from "node:assert/strict"; import { activeMappings, defaultMappings, isSupportedManifestUpload, normalizeIdentifier, payableSummary, repeatWithinWindow, validateManifestCsv } from "../lib/intake.ts";
const header="Case No,Booking ID,Embassy,Location,Booking Date,Reporting Date,Amount";
test("normalizes case and booking identifiers consistently",()=>assert.equal(normalizeIdentifier(" pk- 12/ab "),"PK12AB"));
test("accepts configured header variations and exact paisa",()=>{const result=validateManifestCsv(`${header}\nCASE-1,BOOK/1,ITALY,ISB,2026-09-01,2026-09-02,30000.25`);assert.equal(result.valid,true);assert.equal(result.rows[0]?.normalized?.visaFeePaisa,3000025)});
test("rejects the complete file when a mandatory row fails",()=>{const result=validateManifestCsv(`${header}\nCASE-1,BOOK-1,ITALY,ISB,2026-09-01,2026-09-02,100\nCASE-2,,ITALY,ISB,not-a-date,2026-09-02,-1`);assert.equal(result.valid,false);assert.ok(result.errors.some(e=>e.code==="MISSING_REQUIRED_VALUE"));assert.ok(result.errors.some(e=>e.code==="INVALID_DATE"));assert.ok(result.errors.some(e=>e.code==="INVALID_AMOUNT"))});
test("detects normalized duplicates within one file",()=>{const result=validateManifestCsv(`${header}\nCASE-1,BOOK-1,ITALY,ISB,2026-09-01,2026-09-02,100\ncase 1,book/1,ITALY,ISB,2026-09-01,2026-09-02,100`);assert.equal(result.valid,false);assert.ok(result.errors.some(e=>e.code==="NORMALIZED_DUPLICATE_BOOKING_IN_FILE"));assert.ok(result.errors.some(e=>e.code==="NORMALIZED_DUPLICATE_CASE_IN_FILE"))});
test("14-day window is inclusive and configurable",()=>{const prior=new Date("2026-09-01T00:00:00Z");assert.equal(repeatWithinWindow(prior,new Date("2026-09-15T00:00:00Z")),true);assert.equal(repeatWithinWindow(prior,new Date("2026-09-16T00:00:00Z")),false);assert.equal(repeatWithinWindow(prior,new Date("2026-09-16T00:00:00Z"),15),true)});
test("payable totals exclude halted, unresolved, and zero-amount exceptions",()=>assert.deepEqual(payableSummary([{status:"Eligible for Payment",visaFeePaisa:10000},{status:"Eligible for Payment",visaFeePaisa:0},{status:"Halted",visaFeePaisa:5000},{status:"Business Decision Required",visaFeePaisa:8000}]),{count:1,amountPaisa:10000}));

test("authoritative manifests require a supported extension and matching media type",()=>{
  assert.equal(isSupportedManifestUpload("manifest.csv","text/csv"),true);
  assert.equal(isSupportedManifestUpload("manifest.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),true);
  assert.equal(isSupportedManifestUpload("manifest.pdf","application/pdf"),false);
  assert.equal(isSupportedManifestUpload("manifest.pdf","text/csv"),false);
  assert.equal(isSupportedManifestUpload("manifest.csv","application/pdf"),false);
});

test("distinguishes exact duplicates",()=>{const result=validateManifestCsv(`${header}\nCASE-1,BOOK-1,ITALY,ISB,2026-09-01,2026-09-02,100\nCASE-1,BOOK-1,ITALY,ISB,2026-09-01,2026-09-02,100`);assert.ok(result.errors.some(e=>e.code==="EXACT_DUPLICATE_BOOKING_IN_FILE"));assert.ok(result.errors.some(e=>e.code==="EXACT_DUPLICATE_CASE_IN_FILE"))});

test("inactive mappings are ignored while active mappings resolve headers",()=>{const configured=[...defaultMappings.map(mapping=>({...mapping,isActive:true})),{canonicalField:"caseNumber" as const,headerVariation:"obsolete case alias",required:true,isActive:false}];const mappings=activeMappings(configured);assert.equal(validateManifestCsv(`${header}\nCASE-1,BOOK-1,ITALY,ISB,2026-09-01,2026-09-02,100`,mappings).valid,true);const obsolete=validateManifestCsv(`Obsolete Case Alias,Booking ID,Embassy,Location,Booking Date,Reporting Date,Amount\nCASE-1,BOOK-1,ITALY,ISB,2026-09-01,2026-09-02,100`,mappings);assert.equal(obsolete.valid,false);assert.ok(obsolete.errors.some(error=>error.code==="MISSING_REQUIRED_HEADER"&&error.field==="caseNumber"))});
