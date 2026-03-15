"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Receipt,
  Clock,
  Users,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Yleiskatsaus", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projektit", icon: FolderKanban },
  { href: "/dashboard/costs", label: "Kustannukset", icon: Receipt },
  { href: "/dashboard/time", label: "Tunnit", icon: Clock },
  { href: "/dashboard/team", label: "Tiimi", icon: Users },
];

interface SidebarNavProps {
  userFullName: string | null;
  userEmail: string | null;
  onNavigate?: () => void;
}

export function SidebarNav({ userFullName, userEmail, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ea580c]">
          <span className="text-sm font-bold text-white">R</span>
        </div>
        <span className="text-lg font-bold text-white">Raksa</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#ea580c] text-white"
                      : "text-slate-300 hover:bg-[#1e293b] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info + logout */}
      <div className="border-t border-[#1e293b] px-4 py-4">
        <div className="mb-3">
          <p className="truncate text-sm font-medium text-white">
            {userFullName ?? "Käyttäjä"}
          </p>
          <p className="truncate text-xs text-slate-400">
            {userEmail ?? ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-slate-400 hover:bg-[#1e293b] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Kirjaudu ulos
        </Button>
      </div>
    </div>
  );
}
