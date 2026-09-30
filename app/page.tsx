import { ArrowRight, Landmark, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getChatGPTUser, chatGPTSignInPath } from "@/app/chatgpt-auth";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const identity = await getChatGPTUser();

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-mark" aria-hidden="true"><Landmark /></div>
        <p className="eyebrow">INTIANA Finance · Controlled Access</p>
        <h1>Visa Fee Payment Control</h1>
        <p className="auth-copy">Secure daily payment operations, approval evidence, and reconciliation history in one auditable workspace.</p>
        <div className="control-list" aria-label="Security controls">
          <span><LockKeyhole /> Authenticated access</span>
          <span><ShieldCheck /> Role-based permissions</span>
        </div>
        {identity ? (
          <Button asChild size="lg" className="w-full"><Link href="/dashboard">Continue as {identity.displayName}<ArrowRight /></Link></Button>
        ) : (
          <Button asChild size="lg" className="w-full"><a href={chatGPTSignInPath("/dashboard")} target="_top">Sign in securely<ArrowRight /></a></Button>
        )}
        <p className="auth-footnote">Access is restricted to authorized Operations, Finance, Treasury, Management, and Administration users.</p>
      </section>
      <aside className="auth-context" aria-label="System context">
        <div><span className="context-index">01</span><h2>Evidence before execution.</h2><p>Every material action is attributed, time-stamped, and retained.</p></div>
        <dl><div><dt>Currency</dt><dd>PKR</dd></div><div><dt>Fiscal year</dt><dd>July—June</dd></div><div><dt>Business time</dt><dd>Asia/Karachi</dd></div></dl>
      </aside>
    </main>
  );
}
