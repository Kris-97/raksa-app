import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
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

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const userFullName = profile?.full_name ?? null;
  const userEmail = user.email ?? null;

  return (
    <DashboardShell userFullName={userFullName} userEmail={userEmail}>
      {children}
    </DashboardShell>
  );
}
