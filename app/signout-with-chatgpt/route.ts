import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") || "/";

  const destination = new URL(returnTo.startsWith("/") ? returnTo : "/", request.url);
  const response = NextResponse.redirect(destination);
  response.cookies.delete("__sites_local_auth");
  return response;
}

export async function POST(request: Request) {
  return GET(request);
}
