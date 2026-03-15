import { createClient } from "@/lib/supabase-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban,
  TrendingUp,
  Clock,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import type { ProjectBudgetSummary } from "@/lib/types";

function progressColor(pct: number) {
  if (pct >= 95) return "[&>div]:bg-red-500";
  if (pct >= 80) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-green-500";
}

export default async function DashboardOverview() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("project_budget_summary")
    .select("*")
    .order("project_name");

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: weekEntries } = await supabase
    .from("time_entries")
    .select("clock_in, clock_out, break_minutes")
    .gte("clock_in", weekAgo.toISOString());

  const weekHours = (weekEntries || []).reduce((sum, e: any) => {
    if (!e.clock_out) return sum;
    const ms = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
    return sum + (ms / 1000 / 60 - e.break_minutes) / 60;
  }, 0);

  const allProjects = (projects || []) as ProjectBudgetSummary[];
  const activeProjects = allProjects.filter((p) => p.project_status === "käynnissä");
  const totalBudget = allProjects.reduce((s, p) => s + p.total_budget, 0);
  const totalSpent = allProjects.reduce((s, p) => s + p.total_spent, 0);
  const alerts = allProjects.filter(
    (p) => p.used_percent >= 80 && p.project_status === "käynnissä"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Yleiskatsaus</h1>

      {/* Budget alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((p) => (
            <div
              key={p.project_id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                p.used_percent >= 95
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">
                <strong>{p.project_name}</strong>
                {p.used_percent >= 95
                  ? ` ylittää budjetin! (${p.used_percent}% käytetty)`
                  : ` lähestyy budjettia (${p.used_percent}% käytetty)`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktiiviset projektit
            </CardTitle>
            <FolderKanban className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeProjects.length}</div>
            <p className="text-xs text-muted-foreground">{allProjects.length} yhteensä</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kokonaisbudjetti
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalSpent)} käytetty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tunnit tällä viikolla
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{weekHours.toFixed(0)} h</div>
            <p className="text-xs text-muted-foreground">Viimeiset 7 päivää</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budjettivaroitukset
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{alerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {alerts.filter((a) => a.used_percent >= 95).length} kriittistä
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Project cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Projektit</h2>
          <Link href="/dashboard/projects/new" className="text-sm text-primary hover:underline">
            + Uusi projekti
          </Link>
        </div>

        {allProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ei projekteja vielä. Luo ensimmäinen projekti aloittaaksesi!
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {allProjects.map((p) => {
              const daysRemaining = p.end_date
                ? Math.ceil((new Date(p.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <Link key={p.project_id} href={`/dashboard/projects/${p.project_id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{p.project_name}</span>
                        <Badge
                          variant="outline"
                          className={
                            p.used_percent >= 95
                              ? "bg-red-50 text-red-700"
                              : p.used_percent >= 80
                              ? "bg-amber-50 text-amber-700"
                              : "bg-green-50 text-green-700"
                          }
                        >
                          {p.used_percent}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {p.project_code} — {p.client}
                      </p>
                      <Progress
                        value={Math.min(p.used_percent, 100)}
                        className={`h-2 mb-2 ${progressColor(p.used_percent)}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(p.total_spent)}</span>
                        <span>{formatCurrency(p.total_budget)}</span>
                      </div>
                      {daysRemaining !== null && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {daysRemaining > 0
                            ? `${daysRemaining} päivää jäljellä`
                            : daysRemaining === 0
                            ? "Päättyy tänään"
                            : `${Math.abs(daysRemaining)} päivää myöhässä`}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
