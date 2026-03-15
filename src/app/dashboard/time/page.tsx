"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatTime } from "@/lib/utils";
import type { TimeEntry, Project, Profile } from "@/lib/types";

function calcHours(entry: TimeEntry): string {
  if (!entry.clock_out) return "Käynnissä";
  const ms = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
  const hours = (ms / 1000 / 60 - entry.break_minutes) / 60;
  return hours.toFixed(1) + " h";
}

export default function AdminTimePage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Profile[]>([]);
  const [filterProject, setFilterProject] = useState("all");
  const [filterWorker, setFilterWorker] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      supabase
        .from("time_entries")
        .select("*, user:profiles(full_name), project:projects(name, code)")
        .order("clock_in", { ascending: false })
        .limit(200),
      supabase.from("projects").select("*").order("name"),
      supabase.from("profiles").select("*").order("full_name"),
    ]).then(([entriesRes, projectsRes, workersRes]) => {
      setEntries(entriesRes.data || []);
      setProjects(projectsRes.data || []);
      setWorkers(workersRes.data || []);
      setLoading(false);
    });
  }, []);

  async function approveEntry(id: string, approve: boolean) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("time_entries")
      .update({
        is_approved: approve,
        approved_by: approve ? user!.id : null,
      })
      .eq("id", id);

    if (error) {
      toast.error("Virhe: " + error.message);
      return;
    }

    setEntries(
      entries.map((e) =>
        e.id === id ? { ...e, is_approved: approve } : e
      )
    );
    toast.success(approve ? "Hyväksytty" : "Hylätty");
  }

  const filtered = entries.filter((e) => {
    if (filterProject !== "all" && e.project_id !== filterProject) return false;
    if (filterWorker !== "all" && e.user_id !== filterWorker) return false;
    return true;
  });

  const totalHours = filtered.reduce((sum, e) => {
    if (!e.clock_out) return sum;
    const ms = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
    return sum + (ms / 1000 / 60 - e.break_minutes) / 60;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tuntikirjaukset</h1>
          <p className="text-muted-foreground">
            Yhteensä: {totalHours.toFixed(1)} h ({filtered.length} kirjausta)
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Kaikki projektit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kaikki projektit</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code} — {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterWorker} onValueChange={setFilterWorker}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Kaikki työntekijät" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Kaikki työntekijät</SelectItem>
            {workers.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Päivä</TableHead>
                <TableHead>Työntekijä</TableHead>
                <TableHead>Projekti</TableHead>
                <TableHead>Sisään</TableHead>
                <TableHead>Ulos</TableHead>
                <TableHead>Tauko</TableHead>
                <TableHead>Tunnit</TableHead>
                <TableHead>Tila</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Ei tuntikirjauksia
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.clock_in)}</TableCell>
                    <TableCell>{entry.user?.full_name || "—"}</TableCell>
                    <TableCell>{entry.project?.code || "—"}</TableCell>
                    <TableCell>{formatTime(entry.clock_in)}</TableCell>
                    <TableCell>
                      {entry.clock_out ? formatTime(entry.clock_out) : "—"}
                    </TableCell>
                    <TableCell>{entry.break_minutes} min</TableCell>
                    <TableCell className="font-medium">{calcHours(entry)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          entry.is_approved
                            ? "bg-green-50 text-green-700"
                            : "bg-yellow-50 text-yellow-700"
                        }
                      >
                        {entry.is_approved ? "Hyväksytty" : "Odottaa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {!entry.is_approved && entry.clock_out && (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-green-600 hover:text-green-700"
                            onClick={() => approveEntry(entry.id, true)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {entry.is_approved && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600"
                          onClick={() => approveEntry(entry.id, false)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
