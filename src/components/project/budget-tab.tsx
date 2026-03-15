"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { BudgetChart } from "@/components/project/budget-chart";
import type { BudgetCategory, Cost } from "@/lib/types";

interface BudgetTabProps {
  projectId: string;
  categories: BudgetCategory[];
  costs: Cost[];
  totalBudget: number;
  totalSpent: number;
  usedPercent: number;
}

export function BudgetTab({
  projectId,
  categories: initialCategories,
  costs,
  totalBudget,
  totalSpent,
  usedPercent,
}: BudgetTabProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [adding, setAdding] = useState(false);

  // Calculate spent per category
  const spentByCategory = costs.reduce<Record<string, number>>((acc, cost) => {
    const catId = cost.budget_category_id || "uncategorized";
    acc[catId] = (acc[catId] || 0) + cost.amount_with_vat;
    return acc;
  }, {});

  async function addCategory() {
    if (!newName.trim()) return;
    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("budget_categories")
      .insert({
        project_id: projectId,
        name: newName.trim(),
        budgeted_amount: parseFloat(newAmount) || 0,
        sort_order: categories.length,
      })
      .select()
      .single();

    if (error) {
      toast.error("Virhe: " + error.message);
    } else if (data) {
      setCategories([...categories, data]);
      setNewName("");
      setNewAmount("");
      toast.success("Kategoria lisätty");
    }
    setAdding(false);
  }

  async function deleteCategory(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("budget_categories").delete().eq("id", id);
    if (error) {
      toast.error("Virhe: " + error.message);
    } else {
      setCategories(categories.filter((c) => c.id !== id));
      toast.success("Kategoria poistettu");
    }
  }

  function healthColor(pct: number) {
    if (pct >= 95) return "[&>div]:bg-red-500";
    if (pct >= 80) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-green-500";
  }

  return (
    <div className="space-y-6">
      {/* Overview card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Kokonaisbudjetti</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Käytetty</p>
              <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Jäljellä</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBudget - totalSpent)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Budjetin käyttö</span>
              <span className={usedPercent >= 95 ? "text-red-600" : usedPercent >= 80 ? "text-amber-600" : "text-green-600"}>
                {usedPercent}%
              </span>
            </div>
            <Progress value={Math.min(usedPercent, 100)} className={`h-3 ${healthColor(usedPercent)}`} />
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budjetti vs. toteuma</CardTitle>
          </CardHeader>
          <CardContent>
            <BudgetChart categories={categories} spentByCategory={spentByCategory} />
          </CardContent>
        </Card>
      )}

      {/* Category list */}
      <Card>
        <CardHeader>
          <CardTitle>Budjettikategoriat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.map((cat) => {
            const spent = spentByCategory[cat.id] || 0;
            const pct = cat.budgeted_amount > 0 ? Math.round((spent / cat.budgeted_amount) * 100) : 0;
            return (
              <div key={cat.id} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(spent)} / {formatCurrency(cat.budgeted_amount)}
                    </span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className={`h-1.5 mt-1 ${healthColor(pct)}`} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteCategory(cat.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}

          {/* Add new category */}
          <div className="flex items-end gap-2 pt-2 border-t">
            <div className="flex-1">
              <Input
                placeholder="Kategorian nimi (esim. Materiaalit)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="w-32">
              <Input
                type="number"
                placeholder="Budjetti €"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <Button size="icon" onClick={addCategory} disabled={adding || !newName.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
