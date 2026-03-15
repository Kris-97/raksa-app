import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { formatDate, formatTime } from "@/lib/utils";
import type { TimeEntry } from "@/lib/types";

export default async function WorkerHoursPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch last 30 days of time entries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: entries } = await supabase
    .from("time_entries")
    .select("*, project:projects(id, name, code)")
    .eq("user_id", user.id)
    .gte("clock_in", thirtyDaysAgo.toISOString())
    .order("clock_in", { ascending: false })
    .returns<TimeEntry[]>();

  const timeEntries = entries || [];

  function computeHours(entry: TimeEntry): string {
    if (!entry.clock_out) return "Käynnissä";
    const start = new Date(entry.clock_in).getTime();
    const end = new Date(entry.clock_out).getTime();
    const diffMinutes = Math.floor((end - start) / 60000) - entry.break_minutes;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, "0")}min`;
  }

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-foreground">
        Omat tunnit — 30 pv
      </h1>

      {timeEntries.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          Ei tuntimerkintöjä viimeisen 30 päivän ajalta.
        </p>
      ) : (
        <div className="space-y-3">
          {timeEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">
                    {entry.project?.name || "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(entry.clock_in)}
                    {" \u00B7 "}
                    {formatTime(entry.clock_in)}
                    {entry.clock_out && ` — ${formatTime(entry.clock_out)}`}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                    {computeHours(entry)}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      !entry.clock_out
                        ? "bg-raksa-orange/10 text-raksa-orange"
                        : entry.is_approved
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {!entry.clock_out
                      ? "Käynnissä"
                      : entry.is_approved
                        ? "Hyväksytty"
                        : "Odottaa"}
                  </span>
                </div>
              </div>
              {entry.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {entry.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
