import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { INIT_SQL } from "@/db/init-sql";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: any = {};
  try {
    if (!env?.DB) {
      return NextResponse.json({ error: "env.DB not found" }, { status: 500 });
    }

    // Check existing tables
    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    results.existingTables = tables.results?.map((r: any) => r.name);

    if (!results.existingTables?.includes("users")) {
      // Clean SQL by removing PRAGMA
      const cleanSql = INIT_SQL.replace(/PRAGMA\s+foreign_keys\s*=\s*ON\s*;/gi, "");
      
      // Try executing statements
      try {
        await env.DB.exec(cleanSql);
        results.execResult = "Executed successfully without PRAGMA";
      } catch (execErr: any) {
        results.execError = execErr.message || String(execErr);
        
        // Fallback: split and execute individually
        const statements = cleanSql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        const statementErrors: string[] = [];
        let executedCount = 0;
        for (const stmt of statements) {
          try {
            await env.DB.exec(stmt);
            executedCount++;
          } catch (stmtErr: any) {
            statementErrors.push(`Error on [${stmt.slice(0, 40)}...]: ${stmtErr.message}`);
          }
        }
        results.splitExec = { executedCount, errors: statementErrors.slice(0, 5) };
      }

      // Check again after execution
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
