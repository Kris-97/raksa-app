"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";
import type { TimeEntry } from "@/lib/types";

interface TimeTabProps {
  projectId: string;
  entries: TimeEntry[];
}

function calcHours(entry: TimeEntry): string {
  if (!entry.clock_out) return "Käynnissä";
  const ms = new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime();
  const hours = (ms / 1000 / 60 - entry.break_minutes) / 60;
  return hours.toFixed(1) + " h";
}

export function TimeTab({ entries }: TimeTabProps) {
  const totalHours = entries.reduce((sum, e) => {
    if (!e.clock_out) return sum;
    const ms = new Date(e.clock_out).getTime() - new Date(e.clock_in).getTime();
    return sum + (ms / 1000 / 60 - e.break_minutes) / 60;
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Yhteensä: <strong className="text-foreground">{totalHours.toFixed(1)} h</strong></span>
        <span>Kirjauksia: <strong className="text-foreground">{entries.length}</strong></span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Päivä</TableHead>
                <TableHead>Työntekijä</TableHead>
                <TableHead>Sisään</TableHead>
                <TableHead>Ulos</TableHead>
                <TableHead>Tauko</TableHead>
                <TableHead>Tunnit</TableHead>
                <TableHead>Tila</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Ei tuntikirjauksia
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDate(entry.clock_in)}</TableCell>
                    <TableCell>{(entry as any).user?.full_name || "—"}</TableCell>
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
