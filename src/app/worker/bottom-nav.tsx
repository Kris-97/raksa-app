"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, List, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/worker", label: "Leimaus", icon: Clock },
  { href: "/worker/hours", label: "Tunnit", icon: List },
  { href: "/worker/upload", label: "Kuitti", icon: Camera },
] as const;

export function WorkerBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white">
      <div className="flex items-center justify-around">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/worker"
              ? pathname === "/worker"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors",
                isActive
                  ? "text-raksa-orange font-semibold"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
