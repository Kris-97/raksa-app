import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetTab } from "@/components/project/budget-tab";
import { CostsTab } from "@/components/project/costs-tab";
import { TimeTab } from "@/components/project/time-tab";
import { LogsTab } from "@/components/project/logs-tab";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  suunnittelu: "Suunnittelu",
  käynnissä: "Käynnissä",
  valmis: "Valmis",
  keskeytetty: "Keskeytetty",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const { data: summary } = await supabase
    .from("project_budget_summary")
    .select("*")
    .eq("project_id", id)
    .single();

  const { data: categories } = await supabase
    .from("budget_categories")
    .select("*")
    .eq("project_id", id)
    .order("sort_order");

  const { data: costs } = await supabase
    .from("costs")
    .select("*, budget_category:budget_categories(name)")
    .eq("project_id", id)
    .order("invoice_date", { ascending: false });

  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("*, user:profiles(full_name)")
    .eq("project_id", id)
    .order("clock_in", { ascending: false })
    .limit(50);

  const { data: logs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("project_id", id)
    .order("log_date", { ascending: false })
    .limit(30);

  const usedPercent = summary?.used_percent || 0;

  return (
    <div>
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Projektit
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge variant="outline">{statusLabels[project.status]}</Badge>
          </div>
          <p className="text-muted-foreground">
            {project.code} — {project.client}
            {project.address && ` — ${project.address}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">
            {formatCurrency(summary?.total_spent || 0)}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              / {formatCurrency(project.total_budget)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(project.start_date)}
            {project.end_date && ` — ${formatDate(project.end_date)}`}
          </p>
        </div>
      </div>

      <Tabs defaultValue="budjetti" className="space-y-4">
        <TabsList>
          <TabsTrigger value="budjetti">Budjetti</TabsTrigger>
          <TabsTrigger value="kustannukset">Kustannukset</TabsTrigger>
          <TabsTrigger value="tunnit">Tunnit</TabsTrigger>
          <TabsTrigger value="loki">Päiväloki</TabsTrigger>
        </TabsList>

        <TabsContent value="budjetti">
          <BudgetTab
            projectId={id}
            categories={categories || []}
            costs={costs || []}
            totalBudget={project.total_budget}
            totalSpent={summary?.total_spent || 0}
            usedPercent={usedPercent}
          />
        </TabsContent>

        <TabsContent value="kustannukset">
          <CostsTab projectId={id} costs={costs || []} categories={categories || []} />
        </TabsContent>

        <TabsContent value="tunnit">
          <TimeTab projectId={id} entries={timeEntries || []} />
        </TabsContent>

        <TabsContent value="loki">
          <LogsTab projectId={id} logs={logs || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
