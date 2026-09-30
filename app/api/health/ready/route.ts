import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { operationalLog } from "@/lib/operational-logger";
import { validateRuntimeConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    const config = validateRuntimeConfig(process.env);
    if (!env.DB) throw new Error("database binding unavailable");
    await Promise.race([
      env.DB.prepare("SELECT 1 AS ready").first(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("database check timed out")), config.readinessTimeoutMs)),
    ]);
    operationalLog("info", "readiness_check", { outcome: "ready", duration_ms: Date.now() - started });
    return NextResponse.json({ status: "ready", checks: { configuration: "ok", database: "ok" } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    operationalLog("error", "readiness_check", { outcome: "not_ready", duration_ms: Date.now() - started, error_type: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ status: "not_ready" }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } });
  }
}
