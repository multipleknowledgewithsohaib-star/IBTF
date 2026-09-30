export type OracleApMapping = {
  isActive: boolean;
  approvalStatus: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  vendorName: string;
  vendorNumber: string;
  vendorSiteCode: string;
  operatingUnit: string;
  orgId: string;
  termsName: string;
  invoiceSource: string;
  lineType: string;
  interfaceStatus: string;
  accountSegmentsJson: string;
  concatenatedAccount: string;
};

export function oracleApMappingEffective(mapping: OracleApMapping, on: Date): boolean {
  return mapping.isActive
    && mapping.approvalStatus === "APPROVED"
    && mapping.effectiveFrom <= on
    && (!mapping.effectiveTo || mapping.effectiveTo >= on);
}

export function validateOracleApMapping(mapping: OracleApMapping): Record<string, string> {
  for (const [field, value] of Object.entries({
    vendorName: mapping.vendorName,
    vendorNumber: mapping.vendorNumber,
    vendorSiteCode: mapping.vendorSiteCode,
    operatingUnit: mapping.operatingUnit,
    orgId: mapping.orgId,
    termsName: mapping.termsName,
    invoiceSource: mapping.invoiceSource,
    lineType: mapping.lineType,
    interfaceStatus: mapping.interfaceStatus,
    concatenatedAccount: mapping.concatenatedAccount,
  })) {
    if (!value.trim()) throw new Error(`${field} is required`);
  }
  const segments: unknown = JSON.parse(mapping.accountSegmentsJson);
  if (!segments || Array.isArray(segments) || typeof segments !== "object") throw new Error("Account flexfield segments must be a JSON object.");
  const entries = Object.entries(segments as Record<string, unknown>);
  if (!entries.length || entries.some(([key, value]) => !key.trim() || typeof value !== "string" || !value.trim())) {
    throw new Error("Every account flexfield segment must have a non-empty name and value.");
  }
  return Object.fromEntries(entries.map(([key, value]) => [key, String(value)]));
}
