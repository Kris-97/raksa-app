import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, MapPin, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ProjectBudgetSummary } from "@/lib/types";

const statusColors: Record<string, string> = {
  suunnittelu: "bg-blue-100 text-blue-700",
  käynnissä: "bg-green-100 text-green-700",
  valmis: "bg-slate-100 text-slate-700",
  keskeytetty: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  suunnittelu: "Suunnittelu",
  käynnissä: "Käynnissä",
  valmis: "Valmis",
  keskeytetty: "Keskeytetty",
};

function healthColor(pct: number) {
  if (pct >= 95) return "text-red-600";
  if (pct >= 80) return "text-amber-600";
  return "text-green-600";
}

function progressColor(pct: number) {
  if (pct >= 95) return "[&>div]:bg-red-500";
  if (pct >= 80) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-green-500";
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("project_budget_summary")
    .select("*")
    .order("project_name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Projektit</h1>
        <Link href="/dashboard/projects/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Uusi projekti
          </Button>
        </Link>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Ei projekteja vielä. Luo ensimmäinen projekti!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(projects as ProjectBudgetSummary[]).map((p) => (
            <Link key={p.project_id} href={`/dashboard/projects/${p.project_id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{p.project_name}</CardTitle>
                    <Badge className={statusColors[p.project_status] || ""} variant="outline">
                      {statusLabels[p.project_status] || p.project_status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.project_code} — {p.client}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Budjetti</span>
                        <span className={healthColor(p.used_percent)}>
                          {p.used_percent}%
                        </span>
                      </div>
                      <Progress
                        value={Math.min(p.used_percent, 100)}
                        className={`h-2 ${progressColor(p.used_percent)}`}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{formatCurrency(p.total_spent)} käytetty</span>
                        <span>{formatCurrency(p.total_budget)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(p.start_date)}
                        {p.end_date && ` — ${formatDate(p.end_date)}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
