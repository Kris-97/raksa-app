"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();

    // Get user's org_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) {
      toast.error("Profiilia ei löytynyt");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("projects").insert({
      organization_id: profile.organization_id,
      name: form.get("name") as string,
      code: form.get("code") as string,
      client: form.get("client") as string,
      address: form.get("address") as string || null,
      total_budget: parseFloat(form.get("total_budget") as string) || 0,
      start_date: form.get("start_date") as string,
      end_date: (form.get("end_date") as string) || null,
      status: form.get("status") as string,
      description: (form.get("description") as string) || null,
    });

    if (error) {
      toast.error("Virhe: " + error.message);
      setLoading(false);
      return;
    }

    toast.success("Projekti luotu!");
    router.push("/dashboard/projects");
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Takaisin
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Uusi projekti</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Projektin nimi *</Label>
                <Input id="name" name="name" required placeholder="esim. Kalasatama As Oy" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Projektikoodi *</Label>
                <Input id="code" name="code" required placeholder="esim. KAL-001" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client">Asiakas *</Label>
                <Input id="client" name="client" required placeholder="esim. As Oy Kalasataman Helmi" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Osoite</Label>
                <Input id="address" name="address" placeholder="esim. Kalasatamankatu 12" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="total_budget">Kokonaisbudjetti (EUR) *</Label>
                <Input
                  id="total_budget"
                  name="total_budget"
                  type="number"
                  required
                  min="0"
                  step="100"
                  placeholder="esim. 450000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Tila</Label>
                <Select name="status" defaultValue="suunnittelu">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suunnittelu">Suunnittelu</SelectItem>
                    <SelectItem value="käynnissä">Käynnissä</SelectItem>
                    <SelectItem value="valmis">Valmis</SelectItem>
                    <SelectItem value="keskeytetty">Keskeytetty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start_date">Aloituspäivä *</Label>
                <Input id="start_date" name="start_date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Päättymispäivä</Label>
                <Input id="end_date" name="end_date" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Kuvaus</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Projektin lisätiedot..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Luodaan..." : "Luo projekti"}
              </Button>
              <Link href="/dashboard/projects">
                <Button type="button" variant="outline">
                  Peruuta
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
