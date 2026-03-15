"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/sidebar-nav";

interface DashboardShellProps {
  children: React.ReactNode;
  userFullName: string | null;
  userEmail: string | null;
}

export function DashboardShell({
  children,
  userFullName,
  userEmail,
}: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 bg-[#0f172a] md:block">
        <SidebarNav userFullName={userFullName} userEmail={userEmail} />
      </aside>

      {/* Mobile header + sheet */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-2 border-b bg-white px-4 md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Avaa valikko</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-[#0f172a] p-0">
              <SheetTitle className="sr-only">Navigaatio</SheetTitle>
              <SidebarNav
                userFullName={userFullName}
                userEmail={userEmail}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ea580c]">
              <span className="text-xs font-bold text-white">R</span>
            </div>
            <span className="text-base font-bold">Raksa</span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
