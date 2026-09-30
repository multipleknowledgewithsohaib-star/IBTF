import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { chatGPTSignOutPath } from "@/app/chatgpt-auth";

export function WorkspaceShell({ user, title, children }: { user: { displayName: string; roles: string[] }; title: string; children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="workspace-header">
          <div className="flex items-center gap-3"><SidebarTrigger /><div><p className="eyebrow mb-0">Operational IBFT Web System</p><h1>{title}</h1></div></div>
          <a className="signout-link" href={chatGPTSignOutPath("/")} target="_top"><LogOut /> Sign out</a>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
