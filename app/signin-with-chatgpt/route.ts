import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { INIT_SQL } from "@/db/init-sql";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to") || "/dashboard";

  // Auto-initialize DB tables if not already initialized
  try {
    if (env?.DB) {
      const test = await env.DB.prepare(
        "SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name='users'"
      ).first<{ cnt: number }>();
      if (!test || test.cnt === 0) {
        await env.DB.exec(INIT_SQL);
      }
    }
  } catch (err) {
    console.error("DB auto-init error:", err);
  }

  const destination = new URL(returnTo.startsWith("/") ? returnTo : "/dashboard", request.url);
  const response = NextResponse.redirect(destination);
  response.cookies.set("__sites_local_auth", "1", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
  });
  return response;
}

export async function POST(request: Request) {
  return GET(request);
}
