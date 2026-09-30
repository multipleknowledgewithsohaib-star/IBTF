import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  authSubject: text("auth_subject").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const userRoles = sqliteTable("user_roles", {
  userId: text("user_id").notNull().references(() => users.id),
  roleId: text("role_id").notNull().references(() => roles.id),
  assignedAt: integer("assigned_at", { mode: "timestamp_ms" }).notNull(),
  assignedBy: text("assigned_by").references(() => users.id),
}, (table) => [
  uniqueIndex("uq_user_roles_user_role").on(table.userId, table.roleId),
  index("idx_user_roles_user_id").on(table.userId),
]);

export const userAccessHistory = sqliteTable("user_access_history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  roleId: text("role_id").references(() => roles.id),
  action: text("action").notNull(),
  reason: text("reason").notNull(),
  changedBy: text("changed_by").notNull().references(() => users.id),
  correlationId: text("correlation_id").notNull(),
  changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_user_access_history_user_time").on(table.userId, table.changedAt),
  index("idx_user_access_history_actor_time").on(table.changedBy, table.changedAt),
]);

export const embassies = sqliteTable("embassies", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const vacs = sqliteTable("vacs", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  region: text("region").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const beneficiaryBankAccounts = sqliteTable("beneficiary_bank_accounts", {
  id: text("id").primaryKey(),
  embassyId: text("embassy_id").notNull().references(() => embassies.id),
  beneficiaryName: text("beneficiary_name").notNull(),
  iban: text("iban").notNull(),
  bankName: text("bank_name").notNull().default(""),
  vacId: text("vac_id").notNull().references(() => vacs.id),
  effectiveFrom: integer("effective_from", { mode: "timestamp_ms" }).notNull(),
  effectiveTo: integer("effective_to", { mode: "timestamp_ms" }),
  approvalStatus: text("approval_status").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  ...timestamps,
}, (table) => [
  index("idx_beneficiary_embassy_effective").on(table.embassyId, table.effectiveFrom),
]);

export const oracleApAccountMappings = sqliteTable("oracle_ap_account_mappings", {
  id: text("id").primaryKey(),
  embassyId: text("embassy_id").notNull().references(() => embassies.id),
  vacId: text("vac_id").notNull().references(() => vacs.id),
  vendorName: text("vendor_name").notNull(),
  vendorNumber: text("vendor_number").notNull(),
  vendorSiteCode: text("vendor_site_code").notNull(),
  operatingUnit: text("operating_unit").notNull(),
  orgId: text("org_id").notNull(),
  termsName: text("terms_name").notNull(),
  invoiceSource: text("invoice_source").notNull(),
  lineType: text("line_type").notNull().default("ITEM"),
  interfaceStatus: text("interface_status").notNull().default("NEW"),
  ledgerName: text("ledger_name"),
  accountSegmentsJson: text("account_segments_json").notNull(),
  concatenatedAccount: text("concatenated_account").notNull(),
  codeCombinationId: text("code_combination_id"),
  effectiveFrom: integer("effective_from", { mode: "timestamp_ms" }).notNull(),
  effectiveTo: integer("effective_to", { mode: "timestamp_ms" }),
  approvalStatus: text("approval_status").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  approvedBy: text("approved_by").references(() => users.id),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  ...timestamps,
}, (table) => [
  index("idx_oracle_ap_mapping_effective").on(table.embassyId, table.vacId, table.effectiveFrom),
  index("idx_oracle_ap_mapping_vendor_site").on(table.vendorName, table.vendorSiteCode),
]);

export const fileUploads = sqliteTable("file_uploads", {
  id: text("id").primaryKey(),
  originalFileName: text("original_file_name").notNull(),
  fileHash: text("file_hash").notNull(),
  fileType: text("file_type").notNull(),
  detectedType: text("detected_type").notNull().default("UNKNOWN"),
  mediaType: text("media_type").notNull().default("application/octet-stream"),
  originalContentBase64: text("original_content_base64").notNull().default(""),
  submissionDate: integer("submission_date", { mode: "timestamp_ms" }),
  uploaderId: text("uploader_id").notNull().references(() => users.id),
  rowCount: integer("row_count").notNull().default(0),
  acceptedCount: integer("accepted_count").notNull().default(0),
  rejectedCount: integer("rejected_count").notNull().default(0),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("uq_file_upload_hash").on(table.fileHash),
  index("idx_file_upload_status").on(table.status),
]);

export const columnMappings = sqliteTable("column_mappings", {
  id: text("id").primaryKey(), fileType: text("file_type").notNull(), canonicalField: text("canonical_field").notNull(),
  headerVariation: text("header_variation").notNull(), isRequired: integer("is_required", { mode: "boolean" }).notNull().default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("uq_mapping_type_header").on(table.fileType, table.headerVariation)]);

export const uploadRows = sqliteTable("upload_rows", {
  id: text("id").primaryKey(), uploadId: text("upload_id").notNull().references(() => fileUploads.id), rowNumber: integer("row_number").notNull(),
  rawJson: text("raw_json").notNull(), normalizedJson: text("normalized_json"), isValid: integer("is_valid", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("uq_upload_row_number").on(table.uploadId, table.rowNumber)]);

export const validationErrors = sqliteTable("validation_errors", {
  id: text("id").primaryKey(), uploadRowId: text("upload_row_id").notNull().references(() => uploadRows.id),
  errorCode: text("error_code").notNull(), fieldName: text("field_name"), explanation: text("explanation").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_validation_row").on(table.uploadRowId)]);

export const systemRules = sqliteTable("system_rules", {
  code: text("code").primaryKey(), value: text("value").notNull(), description: text("description").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(), updatedBy: text("updated_by").notNull().references(() => users.id),
});

export const operationalEvidenceLinks = sqliteTable("operational_evidence_links", {
  id: text("id").primaryKey(),
  evidenceUploadId: text("evidence_upload_id").notNull().references(() => fileUploads.id),
  manifestUploadId: text("manifest_upload_id").notNull().references(() => fileUploads.id),
  caseId: text("case_id").references(() => cases.id),
  reason: text("reason").notNull(),
  linkedBy: text("linked_by").notNull().references(() => users.id),
  linkedAt: integer("linked_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("uq_operational_evidence_link").on(table.evidenceUploadId, table.manifestUploadId, table.caseId),
  index("idx_operational_evidence_manifest").on(table.manifestUploadId),
]);

export const cases = sqliteTable("cases", {
  id: text("id").primaryKey(),
  normalizedCaseNumber: text("normalized_case_number").notNull(),
  normalizedBookingNumber: text("normalized_booking_number").notNull(),
  originalCaseNumber: text("original_case_number").notNull().default(""),
  originalBookingNumber: text("original_booking_number").notNull().default(""),
  embassyId: text("embassy_id").notNull().references(() => embassies.id),
  vacId: text("vac_id").notNull().references(() => vacs.id),
  sourceUploadId: text("source_upload_id").notNull().references(() => fileUploads.id),
  bookingDate: integer("booking_date", { mode: "timestamp_ms" }).notNull(),
  submissionDate: integer("submission_date", { mode: "timestamp_ms" }).notNull(),
  visaFeePaisa: integer("visa_fee_paisa").notNull(),
  status: text("status").notNull(),
  ...timestamps,
}, (table) => [
  uniqueIndex("uq_cases_booking_embassy").on(table.normalizedBookingNumber, table.embassyId),
  index("idx_cases_case_submission").on(table.normalizedCaseNumber, table.submissionDate),
  index("idx_cases_status_vac").on(table.status, table.vacId),
]);

export const businessDecisions = sqliteTable("business_decisions", {
  id: text("id").primaryKey(), caseId: text("case_id").notNull().references(() => cases.id), decision: text("decision").notNull(),
  reason: text("reason").notNull(), decidedBy: text("decided_by").notNull().references(() => users.id),
  decidedAt: integer("decided_at", { mode: "timestamp_ms" }).notNull(), correlationId: text("correlation_id").notNull(),
}, (table) => [uniqueIndex("uq_business_decision_case").on(table.caseId)]);

export const paymentBatches = sqliteTable("payment_batches", {
  id: text("id").primaryKey(),
  batchReference: text("batch_reference").notNull().unique(),
  embassyId: text("embassy_id").notNull().references(() => embassies.id),
  vacId: text("vac_id").notNull().references(() => vacs.id),
  beneficiaryId: text("beneficiary_id").notNull().references(() => beneficiaryBankAccounts.id),
  beneficiaryNameSnapshot: text("beneficiary_name_snapshot").notNull(),
  beneficiaryAccountSnapshot: text("beneficiary_account_snapshot").notNull(),
  bankNameSnapshot: text("bank_name_snapshot").notNull(),
  oracleApMappingId: text("oracle_ap_mapping_id").references(() => oracleApAccountMappings.id),
  oracleVendorNameSnapshot: text("oracle_vendor_name_snapshot"),
  oracleVendorNumberSnapshot: text("oracle_vendor_number_snapshot"),
  oracleVendorSiteSnapshot: text("oracle_vendor_site_snapshot"),
  oracleOperatingUnitSnapshot: text("oracle_operating_unit_snapshot"),
  oracleOrgIdSnapshot: text("oracle_org_id_snapshot"),
  oracleTermsNameSnapshot: text("oracle_terms_name_snapshot"),
  oracleInvoiceSourceSnapshot: text("oracle_invoice_source_snapshot"),
  oracleLineTypeSnapshot: text("oracle_line_type_snapshot"),
  oracleInterfaceStatusSnapshot: text("oracle_interface_status_snapshot"),
  oracleAccountFlexfieldSnapshot: text("oracle_account_flexfield_snapshot"),
  oracleCodeCombinationIdSnapshot: text("oracle_code_combination_id_snapshot"),
  paymentProcessingDate: integer("payment_processing_date", { mode: "timestamp_ms" }).notNull(),
  payableAmountPaisa: integer("payable_amount_paisa").notNull().default(0),
  caseCount: integer("case_count").notNull().default(0),
  status: text("status").notNull(),
  makerId: text("maker_id").notNull().references(() => users.id),
  checkerId: text("checker_id").references(() => users.id),
  submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  ...timestamps,
}, (table) => [
  index("idx_batches_status_date").on(table.status, table.paymentProcessingDate),
]);

export const paymentBatchCases = sqliteTable("payment_batch_cases", {
  batchId: text("batch_id").notNull().references(() => paymentBatches.id),
  caseId: text("case_id").notNull().references(() => cases.id),
  addedAt: integer("added_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("uq_payment_batch_case").on(table.batchId, table.caseId),
  uniqueIndex("uq_case_single_active_batch").on(table.caseId),
]);

export const paymentBatchBookingBreakups = sqliteTable("payment_batch_booking_breakups", {
  id: text("id").primaryKey(),
  batchId: text("batch_id").notNull().references(() => paymentBatches.id),
  bookingDate: integer("booking_date", { mode: "timestamp_ms" }).notNull(),
  caseCount: integer("case_count").notNull(),
  amountPaisa: integer("amount_paisa").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("uq_batch_booking_date").on(table.batchId, table.bookingDate)]);

export const batchReferenceSequence = sqliteTable("batch_reference_sequence", {
  sequenceDate: text("sequence_date").primaryKey(),
  lastValue: integer("last_value").notNull(),
});

export const statusHistory = sqliteTable("status_history", {
  id: text("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: text("changed_by").notNull().references(() => users.id),
  reason: text("reason"),
  correlationId: text("correlation_id").notNull(),
  changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_status_history_entity").on(table.entityType, table.entityId, table.changedAt),
]);

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  reason: text("reason"),
  correlationId: text("correlation_id").notNull(),
  ipAddress: text("ip_address"),
  occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  index("idx_audit_entity").on(table.entityType, table.entityId, table.occurredAt),
  index("idx_audit_actor_time").on(table.actorId, table.occurredAt),
]);

export const scbConfirmationFiles = sqliteTable("scb_confirmation_files", {
  id: text("id").primaryKey(), originalFileName: text("original_file_name").notNull(), fileHash: text("file_hash").notNull().unique(), mediaType: text("media_type").notNull(), originalContentBase64: text("original_content_base64").notNull(), uploaderId: text("uploader_id").notNull().references(() => users.id), status: text("status").notNull(), rowCount: integer("row_count").notNull().default(0), acceptedCount: integer("accepted_count").notNull().default(0), rejectedCount: integer("rejected_count").notNull().default(0), parsingResultJson: text("parsing_result_json").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_scb_files_status").on(table.status)]);
export const scbConfirmationRecords = sqliteTable("scb_confirmation_records", {
  id: text("id").primaryKey(), fileId: text("file_id").notNull().references(() => scbConfirmationFiles.id), recordNumber: integer("record_number").notNull(), bankReference: text("bank_reference").notNull(), paymentDate: integer("payment_date", { mode: "timestamp_ms" }).notNull(), beneficiaryName: text("beneficiary_name").notNull(), beneficiaryAccount: text("beneficiary_account").notNull(), paidAmountPaisa: integer("paid_amount_paisa").notNull(), embassyReference: text("embassy_reference"), vacReference: text("vac_reference"), narrative: text("narrative"), evidenceLocation: text("evidence_location").notNull(), rawJson: text("raw_json").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("uq_scb_file_record").on(table.fileId, table.recordNumber), index("idx_scb_bank_reference").on(table.bankReference)]);
export const scbValidationErrors = sqliteTable("scb_validation_errors", { id: text("id").primaryKey(), fileId: text("file_id").notNull().references(() => scbConfirmationFiles.id), recordNumber: integer("record_number"), errorCode: text("error_code").notNull(), fieldName: text("field_name"), explanation: text("explanation").notNull(), evidenceLocation: text("evidence_location").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() }, (table) => [index("idx_scb_validation_file").on(table.fileId, table.recordNumber)]);
export const reconciliationResults = sqliteTable("reconciliation_results", {
  id: text("id").primaryKey(), recordId: text("record_id").notNull().references(() => scbConfirmationRecords.id), batchId: text("batch_id").references(() => paymentBatches.id), outcome: text("outcome").notNull(), severity: text("severity").notNull(), explanation: text("explanation").notNull(), expectedAmountPaisa: integer("expected_amount_paisa"), variancePaisa: integer("variance_paisa"), status: text("status").notNull(), matchedBy: text("matched_by").references(() => users.id), reconciledBy: text("reconciled_by").references(() => users.id), correlationId: text("correlation_id").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [uniqueIndex("uq_reconciliation_record").on(table.recordId), index("idx_reconciliation_outcome").on(table.outcome, table.status)]);
export const reconciliationResolutions = sqliteTable("reconciliation_resolutions", { id: text("id").primaryKey(), reconciliationId: text("reconciliation_id").notNull().references(() => reconciliationResults.id), action: text("action").notNull(), reason: text("reason").notNull(), evidenceUploadId: text("evidence_upload_id").notNull().references(() => fileUploads.id), proposedBatchId: text("proposed_batch_id").references(() => paymentBatches.id), requestedBy: text("requested_by").notNull().references(() => users.id), approvedBy: text("approved_by").references(() => users.id), previousStatus: text("previous_status").notNull(), resultingStatus: text("resulting_status").notNull(), correlationId: text("correlation_id").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull() });
export const reconciliationCaseLinks = sqliteTable("reconciliation_case_links", { reconciliationId: text("reconciliation_id").notNull().references(() => reconciliationResults.id), caseId: text("case_id").notNull().references(() => cases.id), sourceUploadId: text("source_upload_id").notNull().references(() => fileUploads.id), bookingBreakupId: text("booking_breakup_id").notNull().references(() => paymentBatchBookingBreakups.id) }, (table) => [uniqueIndex("uq_reconciliation_case_link").on(table.reconciliationId, table.caseId)]);
export const confirmationDocuments = sqliteTable("confirmation_documents", { id: text("id").primaryKey(), reconciliationId: text("reconciliation_id").notNull().references(() => reconciliationResults.id), version: integer("version").notNull(), status: text("status").notNull(), contentJson: text("content_json").notNull(), generatedBy: text("generated_by").notNull().references(() => users.id), generatedAt: integer("generated_at", { mode: "timestamp_ms" }).notNull(), correlationId: text("correlation_id").notNull() }, (table) => [uniqueIndex("uq_confirmation_version").on(table.reconciliationId, table.version)]);


export const uatRuns = sqliteTable("uat_runs", {
  id: text("id").primaryKey(),
  runReference: text("run_reference").notNull().unique(),
  environment: text("environment").notNull(),
  serverName: text("server_name").notNull(),
  applicationVersion: text("application_version").notNull(),
  sourceCommit: text("source_commit").notNull(),
  overallResult: text("overall_result").notNull(),
  passCount: integer("pass_count").notNull().default(0),
  failCount: integer("fail_count").notNull().default(0),
  blockedCount: integer("blocked_count").notNull().default(0),
  notExecutedCount: integer("not_executed_count").notNull().default(0),
  generatedBy: text("generated_by").notNull().references(() => users.id),
  generatedAt: integer("generated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [index("idx_uat_runs_generated_at").on(table.generatedAt)]);

export const uatScenarioResults = sqliteTable("uat_scenario_results", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => uatRuns.id),
  scenarioCode: text("scenario_code").notNull(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  expectedOutcome: text("expected_outcome").notNull(),
  actualOutcome: text("actual_outcome").notNull(),
  result: text("result").notNull(),
  evidenceJson: text("evidence_json").notNull(),
  evaluatedAt: integer("evaluated_at", { mode: "timestamp_ms" }).notNull(),
}, (table) => [
  uniqueIndex("uq_uat_scenario_run_code").on(table.runId, table.scenarioCode),
  index("idx_uat_scenario_result").on(table.result),
]);
