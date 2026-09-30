"use client";

import { useState, type FormEvent } from "react";

type Role = { code: string; name: string; description: string };
type ManagedUser = { id: string; authSubject: string; email: string; displayName: string; isActive: boolean; roles: string[] };

async function send(url: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Access change failed.");
  window.location.reload();
}

function RoleChoices({ roles, selected, setSelected }: { roles: Role[]; selected: string[]; setSelected: (value: string[]) => void }) {
  return <div className="grid gap-2 md:grid-cols-2">{roles.map((role) => <label key={role.code} className="rounded-lg border p-3 text-sm">
    <input type="checkbox" checked={selected.includes(role.code)} onChange={(event) => setSelected(event.target.checked ? [...selected, role.code] : selected.filter((code) => code !== role.code))} />{" "}
    <strong>{role.name}</strong><small className="block text-muted-foreground">{role.description}</small>
  </label>)}</div>;
}

function UserEditor({ user, roles }: { user: ManagedUser; roles: Role[] }) {
  const [selected, setSelected] = useState(user.roles), [reason, setReason] = useState(""), [message, setMessage] = useState("");
  const act = async (action: "ACTIVATE" | "DEACTIVATE" | "REPLACE_ROLES") => {
    setMessage("");
    try { await send(`/api/admin/users/${user.id}`, "PATCH", { action, roleCodes: selected, reason }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Access change failed."); }
  };
  return <div className="rounded-xl border p-4 space-y-3">
    <div><strong>{user.displayName}</strong><span className="ml-2 text-xs">{user.isActive ? "ACTIVE" : "INACTIVE"}</span><small className="block text-muted-foreground">{user.email} · {user.authSubject}</small></div>
    <RoleChoices roles={roles} selected={selected} setSelected={setSelected} />
    <input className="w-full rounded-md border bg-background px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mandatory reason (minimum 10 characters)" />
    <div className="flex flex-wrap gap-2">
      <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" type="button" onClick={() => act("REPLACE_ROLES")}>Save roles</button>
      <button className="rounded-md border px-3 py-2" type="button" onClick={() => act(user.isActive ? "DEACTIVATE" : "ACTIVATE")}>{user.isActive ? "Deactivate" : "Activate"}</button>
    </div>
    {message && <p className="text-sm text-destructive">{message}</p>}
  </div>;
}

export function AccessAdministration({ users, roles }: { users: ManagedUser[]; roles: Role[] }) {
  const [selected, setSelected] = useState<string[]>([]), [message, setMessage] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage("");
    const data = new FormData(event.currentTarget);
    try { await send("/api/admin/users", "POST", { authSubject: data.get("authSubject"), email: data.get("email"), displayName: data.get("displayName"), reason: data.get("reason"), roleCodes: selected }); }
    catch (error) { setMessage(error instanceof Error ? error.message : "User provisioning failed."); }
  }
  return <div className="space-y-5">
    <form onSubmit={create} className="rounded-xl border p-4 space-y-3">
      <h2 className="font-semibold">Open a controlled user account</h2>
      <p className="text-sm text-muted-foreground">New accounts are created inactive. Confirm the exact identity subject with IT, assign formally approved roles, then activate through a separate action.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <input name="displayName" required className="rounded-md border bg-background px-3 py-2" placeholder="Display name" />
        <input name="email" type="email" required className="rounded-md border bg-background px-3 py-2" placeholder="Corporate email" />
        <input name="authSubject" required className="rounded-md border bg-background px-3 py-2" placeholder="Exact SSO / identity subject" />
      </div>
      <RoleChoices roles={roles} selected={selected} setSelected={setSelected} />
      <input name="reason" required className="w-full rounded-md border bg-background px-3 py-2" placeholder="Approval reference / reason (minimum 10 characters)" />
      <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" type="submit">Create inactive user</button>
      {message && <p className="text-sm text-destructive">{message}</p>}
    </form>
    <div className="space-y-4">{users.map((user) => <UserEditor key={user.id} user={user} roles={roles} />)}</div>
  </div>;
}
