import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { CLEAN_STATEMENTS } from "@/db/clean-statements";

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
        for (const stmt of CLEAN_STATEMENTS) {
          try {
            await env.DB.prepare(stmt).run();
          } catch {
            // ignore individual non-fatal statement error
          }
        }
      }

      // Explicitly guarantee local admin user and SYSTEM_ADMIN role exist
      try {
        await env.DB.prepare(
          "INSERT OR IGNORE INTO roles (id, code, name, description, created_at) VALUES ('role-admin', 'SYSTEM_ADMIN', 'System Administrator', 'Administers users, roles, and controlled system configuration.', 1789000000000)"
        ).run();
        await env.DB.prepare(
          "INSERT OR IGNORE INTO users (id, auth_subject, email, display_name, is_active, created_at, updated_at) VALUES ('user-local-admin', 'local_seedy', 'seedy@sites.test', 'Local System Administrator', 1, 1789000000000, 1789000000000)"
        ).run();
        await env.DB.prepare(
          "INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at, assigned_by) VALUES ('user-local-admin', 'role-admin', 1789000000000, 'user-local-admin')"
        ).run();
      } catch {
        // ignore
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
