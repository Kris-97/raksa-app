"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import { formatTime } from "@/lib/utils";
import type { Project, TimeEntry } from "@/lib/types";
import { toast } from "sonner";

export default function WorkerClockPage() {
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load projects and check for active entry
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active projects
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "käynnissä")
        .order("name");

      if (projectData) {
        setProjects(projectData);
        if (projectData.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projectData[0].id);
        }
      }

      // Check for active time entry (clock_out is null)
      const { data: activeData } = await supabase
        .from("time_entries")
        .select("*, project:projects(*)")
        .eq("user_id", user.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .single<TimeEntry>();

      if (activeData) {
        setActiveEntry(activeData);
        setSelectedProjectId(activeData.project_id);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedProjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update elapsed timer every second
  useEffect(() => {
    if (!activeEntry) {
      setElapsed("");
      return;
    }

    function updateElapsed() {
      if (!activeEntry) return;
      const start = new Date(activeEntry.clock_in).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      setElapsed(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  async function handleClockIn() {
    if (!selectedProjectId) {
      toast.error("Valitse ensin projekti");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          project_id: selectedProjectId,
          user_id: user.id,
          clock_in: new Date().toISOString(),
          break_minutes: 0,
        })
        .select("*, project:projects(*)")
        .single<TimeEntry>();

      if (error) {
        toast.error("Leimaus epäonnistui: " + error.message);
        return;
      }

      setActiveEntry(data);
      toast.success("Leimaus sisään onnistui!");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClockOut() {
    if (!activeEntry) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", activeEntry.id);

      if (error) {
        toast.error("Leimaus ulos epäonnistui: " + error.message);
        return;
      }

      setActiveEntry(null);
      setElapsed("");
      toast.success("Leimaus ulos onnistui!");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-raksa-orange border-t-transparent" />
      </div>
    );
  }

  const isClockedIn = !!activeEntry;
  const activeProject = activeEntry?.project;

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-6">
      {/* Project selector */}
      <div className="w-full max-w-sm">
        <label
          htmlFor="project-select"
          className="mb-2 block text-sm font-medium text-foreground"
        >
          Projekti
        </label>
        <select
          id="project-select"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={isClockedIn}
          className="w-full rounded-lg border border-input bg-white px-4 py-3 text-base text-foreground shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-raksa-orange disabled:opacity-60"
        >
          {projects.length === 0 && (
            <option value="">Ei aktiivisia projekteja</option>
          )}
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} — {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Active project & timer */}
      {isClockedIn && activeProject && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Käynnissä</p>
          <p className="text-lg font-semibold text-foreground">
            {activeProject.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Sisään: {formatTime(activeEntry.clock_in)}
          </p>
        </div>
      )}

      {/* Elapsed time */}
      {isClockedIn && (
        <div className="tabular-nums text-5xl font-bold tracking-tight text-foreground">
          {elapsed}
        </div>
      )}

      {/* Clock in / out button */}
      <button
        onClick={isClockedIn ? handleClockOut : handleClockIn}
        disabled={submitting || (!isClockedIn && projects.length === 0)}
        className={`mt-4 flex h-48 w-48 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
          isClockedIn
            ? "bg-red-600 hover:bg-red-700"
            : "bg-raksa-orange hover:bg-raksa-orange-light"
        }`}
      >
        {submitting ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
        ) : isClockedIn ? (
          "LEIMAA ULOS"
        ) : (
          "LEIMAA SISÄÄN"
        )}
      </button>

      {!isClockedIn && (
        <p className="text-sm text-muted-foreground">
          Paina nappia aloittaaksesi työajan seurannan
        </p>
      )}
    </div>
  );
}
