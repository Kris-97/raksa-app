"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, CloudSun, Thermometer, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import type { DailyLog } from "@/lib/types";

interface LogsTabProps {
  projectId: string;
  logs: DailyLog[];
}

export function LogsTab({ projectId, logs: initialLogs }: LogsTabProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("daily_logs")
      .insert({
        project_id: projectId,
        log_date: form.get("log_date") as string,
        weather: (form.get("weather") as string) || null,
        temperature: parseFloat(form.get("temperature") as string) || null,
        workers_on_site: parseInt(form.get("workers") as string) || null,
        notes: form.get("notes") as string,
        created_by: user!.id,
      })
      .select()
      .single();

    if (error) {
      toast.error("Virhe: " + error.message);
    } else if (data) {
      setLogs([data, ...logs]);
      setOpen(false);
      toast.success("Loki tallennettu");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Uusi merkintä
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Päiväloki</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Päivä</Label>
                <Input
                  name="log_date"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="grid gap-4 grid-cols-3">
                <div className="space-y-2">
                  <Label>Sää</Label>
                  <Input name="weather" placeholder="Aurinkoinen" />
                </div>
                <div className="space-y-2">
                  <Label>Lämpötila °C</Label>
                  <Input name="temperature" type="number" step="0.5" placeholder="-5" />
                </div>
                <div className="space-y-2">
                  <Label>Työntekijöitä</Label>
                  <Input name="workers" type="number" placeholder="8" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Muistiinpanot *</Label>
                <Textarea name="notes" required rows={4} placeholder="Päivän tapahtumat, ongelmat, edistyminen..." />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Tallennetaan..." : "Tallenna"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Ei lokimerkintöjä vielä.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{formatDate(log.log_date)}</span>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {log.weather && (
                      <span className="flex items-center gap-1">
                        <CloudSun className="w-3.5 h-3.5" />
                        {log.weather}
                      </span>
                    )}
                    {log.temperature !== null && (
                      <span className="flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5" />
                        {log.temperature}°C
                      </span>
                    )}
                    {log.workers_on_site !== null && (
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {log.workers_on_site}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{log.notes}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
