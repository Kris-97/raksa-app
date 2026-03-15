import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/types";
import { WorkerBottomNav } from "./bottom-nav";
import { WorkerLogout } from "./logout-button";

export default async function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const displayName = profile?.full_name || user.email || "Työntekijä";

  return (
    <div className="flex min-h-dvh flex-col bg-raksa-surface">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-white px-4 py-3">
        <Link href="/worker" className="text-xl font-bold text-raksa-orange">
          Raksa
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground truncate max-w-[150px]">
            {displayName}
          </span>
          <WorkerLogout />
        </div>
      </header>

      {/* Main content — leave room for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom tab navigation */}
      <WorkerBottomNav />
    </div>
  );
}
