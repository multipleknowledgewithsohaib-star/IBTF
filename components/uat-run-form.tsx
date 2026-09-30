"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UatRunForm() {
  const router = useRouter();
  const [serverName, setServerName] = useState("Standalone UAT Server");
  const [sourceCommit, setSourceCommit] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/uat-runs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ serverName, sourceCommit }) });
      const body = await response.json() as { id?: string; error?: string };
      if (!response.ok || !body.id) throw new Error(body.error ?? "UAT run could not be generated.");
      router.push(`/uat/runs/${body.id}`); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "UAT run could not be generated."); }
    finally { setBusy(false); }
  }
  return <div className="rounded-xl border bg-white p-5 shadow-sm">
    <h2 className="text-base font-semibold text-slate-800">Capture a frozen server run</h2>
    <p className="mt-1 text-sm text-slate-500">The system reads current database evidence. It does not allow an operator to choose pass or fail.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
      <Input value={serverName} onChange={(event) => setServerName(event.target.value)} aria-label="UAT server name" placeholder="Standalone UAT Server" />
      <Input value={sourceCommit} onChange={(event) => setSourceCommit(event.target.value)} aria-label="Deployed Git commit" placeholder="Deployed Git commit SHA" />
      <Button onClick={generate} disabled={busy || sourceCommit.trim().length < 7}>{busy ? "Capturing…" : "Generate run"}</Button>
    </div>
    {message && <p role="alert" className="mt-3 text-sm text-red-700">{message}</p>}
  </div>;
}
