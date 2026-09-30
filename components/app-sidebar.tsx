"use client";

import { AlertTriangle, Archive, BadgeCheck, Building2, ClipboardCheck, FileCheck2, FileUp, FlaskConical, Gauge, Landmark, ListChecks, Scale, Settings2, ShieldCheck, UserCog, WalletCards } from "lucide-react";
import Link from "next/link";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const groups = [
  { label: "Control centre", items: [
    { label: "Dashboard", icon: Gauge, href: "/dashboard", stage: 1 },
    { label: "Upload centre", icon: FileUp, href: "/uploads", stage: 2 },
    { label: "Case register", icon: Archive, href: "/cases", stage: 2 },
    { label: "Decision queue", icon: ListChecks, href: "/decisions", stage: 2 },
  ] },
  { label: "Payment cycle", items: [
    { label: "Eligible cases", icon: BadgeCheck, href: "/payment-batches/create", stage: 3 },
    { label: "Payment batches", icon: WalletCards, href: "/payment-batches", stage: 3 },
    { label: "Approval inbox", icon: ClipboardCheck, href: "/approvals", stage: 3 },
    { label: "SCB intake", icon: FileUp, href: "/reconciliation/upload", stage: 4 },
    { label: "Bank matching", icon: Scale, href: "/reconciliation", stage: 4 },
    { label: "Recon exceptions", icon: AlertTriangle, href: "/reconciliation/exceptions", stage: 4 },
    { label: "Recon monitor", icon: FileCheck2, href: "/reconciliation/monitor", stage: 4 },
  ] },
  { label: "Governance", items: [
    { label: "Audit trail", icon: ShieldCheck, href: "/audit", stage: 1 },
    { label: "UAT evidence", icon: FlaskConical, href: "/uat", stage: 7 },
    { label: "Master data", icon: Building2, href: "/admin", stage: 1 },
    { label: "User access", icon: UserCog, href: "/admin/users", stage: 7 },
    { label: "System rules", icon: Settings2, href: "/admin", stage: 1 },
  ] },
];

export function AppSidebar({ user }: { user: { displayName: string; roles: string[] } }) {
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#1bb7a1] text-[#061f2b]"><Landmark className="size-5" /></span>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-semibold tracking-wide text-white">INTIANA FINANCE</p><p className="truncate text-xs text-slate-400">IBFT Control</p></div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild={Boolean(item.href)} tooltip={item.label} isActive={item.href === "/dashboard"} className="text-slate-300 hover:bg-white/8 hover:text-white data-[active=true]:bg-[#1bb7a1]/15 data-[active=true]:text-[#62e3d1]">
                    {item.href ? <Link href={item.href}><item.icon /><span>{item.label}</span></Link> : <button type="button" disabled aria-label={`${item.label}, planned for Stage ${item.stage}`}><item.icon /><span>{item.label}</span></button>}
                  </SidebarMenuButton>
                  {item.stage > 1 && <SidebarMenuBadge className="text-[10px] text-slate-500">S{item.stage}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-white/10 p-4"><div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user.displayName}</p><p className="truncate text-xs text-slate-400">{user.roles.join(" · ")}</p></div></SidebarFooter>
    </Sidebar>
  );
}
