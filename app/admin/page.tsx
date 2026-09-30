import { eq } from "drizzle-orm";
import Link from "next/link";
import { requirePermission } from "@/app/access";
import { WorkspaceShell } from "@/components/workspace-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { beneficiaryBankAccounts, embassies, oracleApAccountMappings, vacs } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requirePermission("master:manage");
  const db = getDb();
  const [beneficiaries, oracleMappings] = await Promise.all([
    db.select({
      id: beneficiaryBankAccounts.id, name: beneficiaryBankAccounts.beneficiaryName,
      account: beneficiaryBankAccounts.iban, bank: beneficiaryBankAccounts.bankName,
      embassy: embassies.name, vac: vacs.name, from: beneficiaryBankAccounts.effectiveFrom,
      to: beneficiaryBankAccounts.effectiveTo, active: beneficiaryBankAccounts.isActive,
      approval: beneficiaryBankAccounts.approvalStatus,
    }).from(beneficiaryBankAccounts)
      .innerJoin(embassies, eq(embassies.id, beneficiaryBankAccounts.embassyId))
      .innerJoin(vacs, eq(vacs.id, beneficiaryBankAccounts.vacId)),
    db.select({
      id: oracleApAccountMappings.id, embassy: embassies.name, vac: vacs.name,
      vendor: oracleApAccountMappings.vendorName, vendorNumber: oracleApAccountMappings.vendorNumber, site: oracleApAccountMappings.vendorSiteCode,
      operatingUnit: oracleApAccountMappings.operatingUnit,
      orgId: oracleApAccountMappings.orgId, termsName: oracleApAccountMappings.termsName,
      invoiceSource: oracleApAccountMappings.invoiceSource, lineType: oracleApAccountMappings.lineType, interfaceStatus: oracleApAccountMappings.interfaceStatus,
      flexfield: oracleApAccountMappings.concatenatedAccount,
      codeCombinationId: oracleApAccountMappings.codeCombinationId,
      from: oracleApAccountMappings.effectiveFrom, to: oracleApAccountMappings.effectiveTo,
      active: oracleApAccountMappings.isActive, approval: oracleApAccountMappings.approvalStatus,
    }).from(oracleApAccountMappings)
      .innerJoin(embassies, eq(embassies.id, oracleApAccountMappings.embassyId))
      .innerJoin(vacs, eq(vacs.id, oracleApAccountMappings.vacId)),
  ]);

  return <WorkspaceShell user={user} title="System administration"><div className="workspace-body">
    <Card><CardHeader><CardTitle>User access administration</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>Create inactive users, assign approved roles, enforce segregation of duties, and retain access-change history.</p><Link className="underline" href="/admin/users">Open user access administration</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Controlled beneficiary history</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground">
      <p>Financial identity fields are append-only. Create a new approved, effective-dated database record rather than overwriting history; no browser mutation is exposed.</p>
      <div className="table-wrap"><table><thead><tr><th>Beneficiary</th><th>Bank / account</th><th>Mapping</th><th>Effective period</th><th>Control state</th></tr></thead><tbody>{beneficiaries.map(row => <tr key={row.id}><td>{row.name}</td><td>{row.bank}<small>{row.account}</small></td><td>{row.embassy}<small>{row.vac}</small></td><td>{row.from.toISOString().slice(0,10)}<small>to {row.to?.toISOString().slice(0,10) ?? "open-ended"}</small></td><td>{row.approval}<small>{row.active ? "Active" : "Inactive"}</small></td></tr>)}</tbody></table></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Oracle AP account flexfield master</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground">
      <p>Each Embassy/Consulate and location requires one approved, active and effective Oracle AP mapping. Approved financial fields are immutable; close the old record and create a newly approved effective-dated record.</p>
      <div className="table-wrap"><table><thead><tr><th>Embassy / location</th><th>AP vendor / site</th><th>Operating unit</th><th>Account flexfield</th><th>Effective period</th><th>Control state</th></tr></thead><tbody>
        {oracleMappings.length ? oracleMappings.map(row => <tr key={row.id}><td>{row.embassy}<small>{row.vac}</small></td><td>{row.vendor}<small>Vendor no. {row.vendorNumber} · Site {row.site}</small></td><td>{row.operatingUnit}<small>ORG_ID {row.orgId}</small><small>{row.invoiceSource} · {row.termsName} · {row.lineType} · {row.interfaceStatus}</small></td><td>{row.flexfield}<small>CCID {row.codeCombinationId ?? "not supplied"}</small></td><td>{row.from.toISOString().slice(0,10)}<small>to {row.to?.toISOString().slice(0,10) ?? "open-ended"}</small></td><td>{row.approval}<small>{row.active ? "Active" : "Inactive"}</small></td></tr>) : <tr><td colSpan={6}>No Oracle AP mapping has been approved. Payment-batch creation will remain blocked until Finance approves one for the selected Embassy/Consulate and location.</td></tr>}
      </tbody></table></div>
    </CardContent></Card>
  </div></WorkspaceShell>;
}
