"use client";

import { useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Cost, BudgetCategory } from "@/lib/types";

interface CostsTabProps {
  projectId: string;
  costs: Cost[];
  categories: BudgetCategory[];
}

export function CostsTab({ projectId, costs: initialCosts, categories }: CostsTabProps) {
  const [costs, setCosts] = useState(initialCosts);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const filteredCosts =
    filterCategory === "all"
      ? costs
      : costs.filter((c) => c.budget_category_id === filterCategory);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const amount = parseFloat(form.get("amount") as string) || 0;
    const vatPercent = parseFloat(form.get("vat_percent") as string) || 25.5;
    const amountWithVat = amount * (1 + vatPercent / 100);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("costs")
      .insert({
        project_id: projectId,
        budget_category_id: (form.get("category") as string) || null,
        description: form.get("description") as string,
        amount,
        vat_percent: vatPercent,
        amount_with_vat: Math.round(amountWithVat * 100) / 100,
        vendor: (form.get("vendor") as string) || null,
        invoice_date: form.get("invoice_date") as string,
        created_by: user!.id,
      })
      .select("*, budget_category:budget_categories(name)")
      .single();

    if (error) {
      toast.error("Virhe: " + error.message);
    } else if (data) {
      setCosts([data, ...costs]);
      setOpen(false);
      toast.success("Kustannus lisätty");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Suodata kategorialla" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Kaikki kategoriat</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Lisää kustannus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uusi kustannus</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Kuvaus *</Label>
                <Input name="description" required placeholder="esim. Betonielementit" />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Summa (ALV 0%) *</Label>
                  <Input name="amount" type="number" step="0.01" required placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>ALV %</Label>
                  <Input name="vat_percent" type="number" step="0.1" defaultValue="25.5" />
                </div>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>Toimittaja</Label>
                  <Input name="vendor" placeholder="esim. Stark" />
                </div>
                <div className="space-y-2">
                  <Label>Kategoria</Label>
                  <Select name="category">
                    <SelectTrigger>
                      <SelectValue placeholder="Valitse..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Laskun päivä *</Label>
                <Input
                  name="invoice_date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Lisätään..." : "Lisää kustannus"}
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
                <TableHead>Päivä</TableHead>
                <TableHead>Kuvaus</TableHead>
                <TableHead>Toimittaja</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead className="text-right">Summa (sis. ALV)</TableHead>
                <TableHead>Tila</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Ei kustannuksia
                  </TableCell>
                </TableRow>
              ) : (
                filteredCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(cost.invoice_date)}
                    </TableCell>
                    <TableCell>{cost.description}</TableCell>
                    <TableCell>{cost.vendor || "—"}</TableCell>
                    <TableCell>
                      {(cost as any).budget_category?.name || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cost.amount_with_vat)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          cost.status === "approved"
                            ? "bg-green-50 text-green-700"
                            : cost.status === "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-yellow-50 text-yellow-700"
                        }
                      >
                        {cost.status === "approved"
                          ? "Hyväksytty"
                          : cost.status === "rejected"
                          ? "Hylätty"
                          : "Odottaa"}
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
