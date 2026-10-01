import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await env.DB.prepare("SELECT * FROM users").all();
    const roles = await env.DB.prepare("SELECT * FROM roles").all();
    const userRoles = await env.DB.prepare("SELECT * FROM user_roles").all();
    return NextResponse.json({ users: users.results, roles: roles.results, userRoles: userRoles.results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
