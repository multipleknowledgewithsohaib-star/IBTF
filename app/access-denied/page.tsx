import { ShieldX } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return <main className="message-shell"><section><ShieldX /><p className="eyebrow">Controlled access</p><h1>Access not authorized</h1><p>Your identity is valid, but no active IBFT role permits this page. Ask the System Administrator to review your role assignment.</p><Button asChild><Link href="/">Return to sign in</Link></Button></section></main>;
}
