import { asc, eq } from "drizzle-orm";
import { getAuthorizedUser } from "@/app/access";
import { getDb } from "@/db";
import { embassies, paymentBatchBookingBreakups, paymentBatches, vacs } from "@/db/schema";
import { hasPermission } from "@/lib/authorization";

const csv = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const amount = (paisa: number) => `${Math.trunc(paisa / 100)}.${String(paisa % 100).padStart(2, "0")}`;
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthorizedUser();
  if (!user || !hasPermission(user.roles, "case:view")) return new Response("Forbidden", { status: 403 });

  const id = (await params).id;
  const db = getDb();
  const batch = (await db.select({
    reference: paymentBatches.batchReference,
    status: paymentBatches.status,
    invoiceAmountPaisa: paymentBatches.payableAmountPaisa,
    oracleSource: paymentBatches.oracleInvoiceSourceSnapshot,
    oracleVendorNumber: paymentBatches.oracleVendorNumberSnapshot,
    oracleSite: paymentBatches.oracleVendorSiteSnapshot,
    oracleOrgId: paymentBatches.oracleOrgIdSnapshot,
    oracleTerms: paymentBatches.oracleTermsNameSnapshot,
    oracleInterfaceStatus: paymentBatches.oracleInterfaceStatusSnapshot,
    oracleFlexfield: paymentBatches.oracleAccountFlexfieldSnapshot,
    oracleLineType: paymentBatches.oracleLineTypeSnapshot,
    embassy: embassies.name,
    vac: vacs.name,
    paymentDate: paymentBatches.paymentProcessingDate,
  }).from(paymentBatches)
    .innerJoin(embassies, eq(embassies.id, paymentBatches.embassyId))
    .innerJoin(vacs, eq(vacs.id, paymentBatches.vacId))
    .where(eq(paymentBatches.id, id)).limit(1))[0];

  if (!batch) return new Response("Not found", { status: 404 });
  if (!batch.oracleSource || !batch.oracleVendorNumber || !batch.oracleSite || !batch.oracleOrgId || !batch.oracleTerms || !batch.oracleInterfaceStatus || !batch.oracleFlexfield || !batch.oracleLineType) {
    return new Response("Oracle AP export is blocked because the payment batch has no complete approved accounting snapshot.", { status: 409 });
  }

  const rows = await db.select().from(paymentBatchBookingBreakups)
    .where(eq(paymentBatchBookingBreakups.batchId, id))
    .orderBy(asc(paymentBatchBookingBreakups.bookingDate));
  const description = `${batch.embassy} visa fee - ${batch.vac}`;
  const headers = [
    "INVOICE_NUM", "INVOICE_DATE", "SOURCE", "VENDOR_NUM", "VENDOR_SITE_CODE",
    "INVOICE_AMOUNT", "INVOICE_CURRENCY_CODE", "ORG_ID", "TERMS_NAME", "DESCRIPTION",
    "LINE_AMOUNT", "LINE_DESCRIPTION", "STATUS", "DIST_CODE_CONCATENATED",
    "LINE_TYPE", "GL_DATE", "BATCH",
  ];
  const lines = [
    headers.map(csv).join(","),
    ...rows.map((row) => [
      batch.reference,
      isoDate(batch.paymentDate),
      batch.oracleSource,
      batch.oracleVendorNumber,
      batch.oracleSite,
      amount(batch.invoiceAmountPaisa),
      "PKR",
      batch.oracleOrgId,
      batch.oracleTerms,
      description,
      amount(row.amountPaisa),
      `${description} - booking ${isoDate(row.bookingDate)}`,
      batch.oracleInterfaceStatus,
      batch.oracleFlexfield,
      batch.oracleLineType,
      isoDate(batch.paymentDate),
      batch.reference,
    ].map(csv).join(",")),
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${batch.reference}-oracle-ap.csv"`,
      "cache-control": "no-store",
    },
  });
}
