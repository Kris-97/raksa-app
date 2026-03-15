"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { BudgetCategory } from "@/lib/types";

interface BudgetChartProps {
  categories: BudgetCategory[];
  spentByCategory: Record<string, number>;
}

export function BudgetChart({ categories, spentByCategory }: BudgetChartProps) {
  const data = categories.map((cat) => ({
    name: cat.name.length > 12 ? cat.name.substring(0, 12) + "…" : cat.name,
    Budjetti: cat.budgeted_amount,
    Toteuma: spentByCategory[cat.id] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" fontSize={12} />
        <YAxis
          fontSize={12}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
          }
        />
        <Tooltip
          formatter={(value) =>
            new Intl.NumberFormat("fi-FI", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(Number(value))
          }
        />
        <Legend />
        <Bar dataKey="Budjetti" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Toteuma" fill="#ea580c" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
