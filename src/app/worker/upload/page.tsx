"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import type { Project } from "@/lib/types";
import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function WorkerUploadPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjects() {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "käynnissä")
        .order("name");

      if (data) {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
      }
      setLoading(false);
    }
    loadProjects();
  }, [supabase]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreview(url);
  }

  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      toast.error("Ota kuva tai valitse tiedosto");
      return;
    }
    if (!selectedProjectId) {
      toast.error("Valitse projekti");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Kirjaudu sisään uudelleen");
        return;
      }

      // Upload to Supabase Storage
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${selectedProjectId}/${user.id}/${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        toast.error("Lataus epäonnistui: " + uploadError.message);
        return;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("receipts").getPublicUrl(path);

      // Insert cost record (pending AI OCR — amount 0 for now)
      const { error: insertError } = await supabase.from("costs").insert({
        project_id: selectedProjectId,
        description: description || "Kuitti (odottaa käsittelyä)",
        amount: 0,
        vat_percent: 25.5,
        amount_with_vat: 0,
        invoice_date: new Date().toISOString().split("T")[0],
        receipt_url: publicUrl,
        status: "pending",
        ai_extracted: false,
        created_by: user.id,
      });

      if (insertError) {
        toast.error("Tallennusvirhe: " + insertError.message);
        return;
      }

      toast.success("Kuitti lähetetty!");
      clearFile();
      setDescription("");
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

  return (
    <div className="px-4 py-6">
      <h1 className="mb-4 text-lg font-bold text-foreground">
        Lisää kuitti
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Camera / file input */}
        <div>
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Kuitin esikatselu"
                className="w-full rounded-lg border border-border object-contain max-h-64"
              />
              <button
                type="button"
                onClick={clearFile}
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
                aria-label="Poista kuva"
              >
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-48 w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-white text-muted-foreground transition-colors hover:border-raksa-orange hover:text-raksa-orange"
            >
              <Camera className="h-10 w-10" />
              <span className="text-sm font-medium">
                Ota kuva tai valitse tiedosto
              </span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Project selector */}
        <div>
          <label
            htmlFor="upload-project"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Projekti
          </label>
          <select
            id="upload-project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full rounded-lg border border-input bg-white px-4 py-3 text-base text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-raksa-orange"
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

        {/* Description */}
        <div>
          <label
            htmlFor="upload-description"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Kuvaus (valinnainen)
          </label>
          <textarea
            id="upload-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Esim. Bauhaus, ruuvit ja kiinnikkeet"
            rows={3}
            className="w-full rounded-lg border border-input bg-white px-4 py-3 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-raksa-orange resize-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !file}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-raksa-orange px-4 py-4 text-base font-semibold text-white shadow transition-colors hover:bg-raksa-orange-light active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Upload className="h-5 w-5" />
              Lähetä kuitti
            </>
          )}
        </button>

        {/* AI OCR placeholder note */}
        <p className="text-center text-xs text-muted-foreground">
          AI-tunnistus lukee kuitin tiedot automaattisesti (tulossa pian)
        </p>
      </form>
    </div>
  );
}
