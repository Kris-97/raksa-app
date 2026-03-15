"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { Project, BudgetCategory } from "@/lib/types";
import { useEffect } from "react";

interface OcrResult {
  vendor: string;
  amount: number;
  vat_percent: number;
  date: string;
  description: string;
  confidence: number;
}

export default function ReceiptUploadPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("projects").select("*").order("name").then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    const supabase = createClient();
    supabase
      .from("budget_categories")
      .select("*")
      .eq("project_id", selectedProject)
      .order("sort_order")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, [selectedProject]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setOcrResult(null);
  }

  async function runOcr() {
    if (!imageFile) return;
    setScanning(true);

    const formData = new FormData();
    formData.append("image", imageFile);

    try {
      const res = await fetch("/api/ai/ocr", { method: "POST", body: formData });
      if (!res.ok) throw new Error("OCR epäonnistui");
      const data = await res.json();
      setOcrResult(data);
      toast.success("Kuitti skannattu!");
    } catch {
      toast.error("Skannaus epäonnistui. Täytä tiedot käsin.");
    }
    setScanning(false);
  }

  async function saveCost(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedProject) {
      toast.error("Valitse projekti");
      return;
    }
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Upload receipt image
    let receiptUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${selectedProject}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, imageFile);
      if (!uploadError) {
        receiptUrl = path;
      }
    }

    const amount = parseFloat(form.get("amount") as string) || 0;
    const vatPercent = parseFloat(form.get("vat_percent") as string) || 25.5;

    const { error } = await supabase.from("costs").insert({
      project_id: selectedProject,
      budget_category_id: (form.get("category") as string) || null,
      description: form.get("description") as string,
      amount,
      vat_percent: vatPercent,
      amount_with_vat: Math.round(amount * (1 + vatPercent / 100) * 100) / 100,
      vendor: (form.get("vendor") as string) || null,
      invoice_date: form.get("invoice_date") as string,
      receipt_url: receiptUrl,
      ai_extracted: !!ocrResult,
      ai_confidence: ocrResult?.confidence || null,
      created_by: user!.id,
    });

    if (error) {
      toast.error("Virhe: " + error.message);
    } else {
      toast.success("Kustannus tallennettu!");
      // Reset
      setImageUrl(null);
      setImageFile(null);
      setOcrResult(null);
      if (fileRef.current) fileRef.current.value = "";
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/costs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Kustannukset
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Kuittiskannaus
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Camera capture */}
          <div>
            <Label>Ota kuva kuitista</Label>
            <Input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="mt-2"
            />
          </div>

          {/* Preview */}
          {imageUrl && (
            <div className="space-y-3">
              <img
                src={imageUrl}
                alt="Kuitti"
                className="max-h-64 rounded-lg border object-contain"
              />
              <Button onClick={runOcr} disabled={scanning} variant="secondary">
                {scanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Skannataan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Skannaa AI:lla
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Cost form */}
          <form onSubmit={saveCost} className="space-y-4">
            <div className="space-y-2">
              <Label>Projekti *</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Valitse projekti" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kuvaus *</Label>
              <Input
                name="description"
                required
                defaultValue={ocrResult?.description || ""}
                key={ocrResult?.description}
              />
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Summa (ALV 0%) *</Label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                  defaultValue={ocrResult?.amount || ""}
                  key={`amt-${ocrResult?.amount}`}
                />
              </div>
              <div className="space-y-2">
                <Label>ALV %</Label>
                <Input
                  name="vat_percent"
                  type="number"
                  step="0.1"
                  defaultValue={ocrResult?.vat_percent || 25.5}
                  key={`vat-${ocrResult?.vat_percent}`}
                />
              </div>
            </div>

            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label>Toimittaja</Label>
                <Input
                  name="vendor"
                  defaultValue={ocrResult?.vendor || ""}
                  key={`vendor-${ocrResult?.vendor}`}
                />
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
              <Label>Päivä *</Label>
              <Input
                name="invoice_date"
                type="date"
                required
                defaultValue={
                  ocrResult?.date || new Date().toISOString().split("T")[0]
                }
                key={`date-${ocrResult?.date}`}
              />
            </div>

            {ocrResult && (
              <p className="text-xs text-muted-foreground">
                AI-luottamus: {Math.round(ocrResult.confidence * 100)}% — tarkista tiedot
              </p>
            )}

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Tallennetaan..." : "Tallenna kustannus"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
