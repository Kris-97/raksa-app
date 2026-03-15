"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/types";

const roleLabels: Record<string, string> = {
  admin: "Ylläpitäjä",
  manager: "Työnjohtaja",
  worker: "Työntekijä",
};

const roleColors: Record<string, string> = {
  admin: "bg-orange-100 text-orange-700",
  manager: "bg-blue-100 text-blue-700",
  worker: "bg-slate-100 text-slate-700",
};

export default function TeamPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .order("role")
      .order("full_name")
      .then(({ data }) => {
        if (data) setMembers(data);
        setLoading(false);
      });
  }, []);

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setInviting(true);

    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const fullName = form.get("full_name") as string;
    const role = form.get("role") as string;
    const hourlyRate = parseFloat(form.get("hourly_rate") as string) || null;

    // Get org_id
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      toast.error("Profiilia ei löytynyt");
      setInviting(false);
      return;
    }

    // Invite via Supabase Auth (admin API would be better, but this works for MVP)
    // For now, create the user invite via the app API
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        full_name: fullName,
        role,
        hourly_rate: hourlyRate,
        organization_id: profile.organization_id,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Kutsun lähettäminen epäonnistui");
    } else {
      toast.success(`Kutsu lähetetty: ${email}`);
      setInviteOpen(false);
      // Refresh list
      const { data: updated } = await supabase
        .from("profiles")
        .select("*")
        .order("role")
        .order("full_name");
      if (updated) setMembers(updated);
    }
    setInviting(false);
  }

  async function toggleActive(member: Profile) {
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);

    if (error) {
      toast.error("Virhe: " + error.message);
    } else {
      setMembers(
        members.map((m) =>
          m.id === member.id ? { ...m, is_active: !m.is_active } : m
        )
      );
      toast.success(member.is_active ? "Deaktivoitu" : "Aktivoitu");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Users className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tiimi</h1>
          <p className="text-muted-foreground">
            {members.filter((m) => m.is_active).length} aktiivista jäsentä
          </p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Kutsu jäsen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kutsu uusi jäsen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label>Sähköposti *</Label>
                <Input name="email" type="email" required placeholder="nimi@esimerkki.fi" />
              </div>
              <div className="space-y-2">
                <Label>Nimi *</Label>
                <Input name="full_name" required placeholder="Matti Meikäläinen" />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Rooli</Label>
                  <Select name="role" defaultValue="worker">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="worker">Työntekijä</SelectItem>
                      <SelectItem value="manager">Työnjohtaja</SelectItem>
                      <SelectItem value="admin">Ylläpitäjä</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tuntipalkka (€)</Label>
                  <Input name="hourly_rate" type="number" step="0.01" placeholder="35.00" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={inviting}>
                {inviting ? "Lähetetään..." : "Lähetä kutsu"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nimi</TableHead>
                <TableHead>Sähköposti</TableHead>
                <TableHead>Rooli</TableHead>
                <TableHead>Tuntipalkka</TableHead>
                <TableHead>Tila</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id} className={!member.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={roleColors[member.role]}>
                      {roleLabels[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.hourly_rate ? `${member.hourly_rate} €/h` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={member.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                      {member.is_active ? "Aktiivinen" : "Ei aktiivinen"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(member)}
                    >
                      {member.is_active ? "Deaktivoi" : "Aktivoi"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
