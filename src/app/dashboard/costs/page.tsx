import { createClient } from "@/lib/supabase-server";
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
import { Button } from "@/components/ui/button";
import { Receipt, Upload } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

export default async function CostsPage() {
  const supabase = await createClient();

  const { data: costs } = await supabase
    .from("costs")
    .select("*, project:projects(name, code), budget_category:budget_categories(name)")
    .order("invoice_date", { ascending: false })
    .limit(100);

  const totalSpent = costs?.reduce((s, c) => s + (c.amount_with_vat || 0), 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kustannukset</h1>
          <p className="text-muted-foreground">
            Yhteensä: {formatCurrency(totalSpent)} ({costs?.length || 0} kirjausta)
          </p>
        </div>
        <Link href="/dashboard/costs/upload">
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Kuittiskannaus
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Päivä</TableHead>
                <TableHead>Projekti</TableHead>
                <TableHead>Kuvaus</TableHead>
                <TableHead>Toimittaja</TableHead>
                <TableHead>Kategoria</TableHead>
                <TableHead>Viite</TableHead>
                <TableHead className="text-right">Summa</TableHead>
                <TableHead>Tila</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!costs || costs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Ei kustannuksia vielä
                  </TableCell>
                </TableRow>
              ) : (
                costs.map((cost: any) => (
                  <TableRow key={cost.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(cost.invoice_date)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/dashboard/projects/${cost.project_id}`}
                        className="text-primary hover:underline"
                      >
                        {cost.project?.code || "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{cost.description}</TableCell>
                    <TableCell>{cost.vendor || "—"}</TableCell>
                    <TableCell>{cost.budget_category?.name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{cost.reference || "—"}</TableCell>
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
                        {cost.status === "approved" ? "Hyväksytty" : cost.status === "rejected" ? "Hylätty" : "Odottaa"}
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
