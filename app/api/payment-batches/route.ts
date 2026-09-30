import { NextResponse } from "next/server";
import { getAuthorizedUser } from "@/app/access";
import { createPaymentBatch, PaymentControlError } from "@/lib/payment-service";

export async function POST(request: Request) {
  const user = await getAuthorizedUser(); if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try { const body = await request.json() as { embassyId?: string; vacId?: string; beneficiaryId?: string; paymentDate?: string; caseIds?: string[] }; if (!body.embassyId || !body.vacId || !body.beneficiaryId || !body.paymentDate || !Array.isArray(body.caseIds)) throw new PaymentControlError("INVALID_REQUEST", "Embassy, VAC, beneficiary, payment date and cases are required."); return NextResponse.json(await createPaymentBatch({ ...body, embassyId: body.embassyId, vacId: body.vacId, beneficiaryId: body.beneficiaryId, paymentDate: body.paymentDate, caseIds: body.caseIds, user }), { status: 201 }); }
  catch (error) { if (error instanceof PaymentControlError) return NextResponse.json({ code: error.code, error: error.message }, { status: error.status }); return NextResponse.json({ error: "Payment batch creation failed safely." }, { status: 500 }); }
}
