import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { CLEAN_STATEMENTS } from "@/db/clean-statements";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: any = {};
  try {
    if (!env?.DB) {
      return NextResponse.json({ error: "env.DB not found" }, { status: 500 });
    }

    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    results.existingTables = tables.results?.map((r: any) => r.name);

    if (!results.existingTables?.includes("users")) {
      let executed = 0;
      let errors: string[] = [];
      for (const stmt of CLEAN_STATEMENTS) {
        try {
          await env.DB.prepare(stmt).run();
          executed++;
        } catch (err: any) {
          errors.push(`Error on [${stmt.slice(0, 40)}...]: ${err.message}`);
        }
      }
      results.executed = executed;
      results.errors = errors.slice(0, 5);

      const tablesAfter = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all();
      results.tablesAfter = tablesAfter.results?.map((r: any) => r.name);
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err), results }, { status: 500 });
  }
}
