"use client";

import React, { useEffect, useState } from 'react';
import { Save, Users, Globe, Loader2, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/lib/useData';
import { settingsAPI } from '@/lib/api';

const FIELDS: { key: string; label: string; type?: string; full?: boolean; multiline?: boolean; hint?: string }[] = [
  { key: "studio_name", label: "Studio Name" },
  { key: "studio_tagline", label: "Tagline" },
  { key: "studio_email", label: "Email", type: "email" },
  { key: "studio_phone", label: "Phone" },
  { key: "studio_whatsapp", label: "WhatsApp Number", hint: "Digits only or with country code — used for every WhatsApp / Book Now button on the website." },
  { key: "studio_address", label: "Address", full: true, multiline: true, hint: "Shown in the website footer. Put each line on its own line (or separate with commas)." },
  { key: "studio_map_embed", label: "Google Maps embed", full: true, multiline: true, hint: "On Google Maps: Share → Embed a map → Copy HTML, and paste it here. Updates the map in the website footer." },
];

export default function SettingsPage() {
  const { data: settings, refetch } = useSettings("profile");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Hydrate the form from the saved studio_* settings once they load.
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const f of FIELDS) next[f.key] = settings[f.key] || "";
    setForm(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.studio_name, settings.studio_tagline, settings.studio_email, settings.studio_phone, settings.studio_whatsapp, settings.studio_address]);

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true); setSaved(false); setError("");
    try {
      await settingsAPI.update(form);
      setSaved(true);
      refetch();
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message || "Couldn't save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto w-full h-full pb-12">
      <div className="shrink-0 px-2 lg:px-0">
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-[14px] text-muted-foreground mt-1">Your studio profile — used across the website and invoices.</p>
      </div>

      {/* Studio Profile (wired to the live settings API) */}
      <div className="dash-card p-8 space-y-6">
        <h2 className="text-xl font-bold text-foreground">Studio Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.key} className={f.full ? "md:col-span-2" : ""}>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">{f.label}</label>
              {f.multiline ? (
                <textarea
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={f.key === "studio_map_embed" ? 4 : 3}
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-foreground text-[14px] focus:outline-none focus:border-primary/50 resize-none"
                />
              ) : (
                <input
                  type={f.type || "text"}
                  value={form[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-foreground text-[14px] focus:outline-none focus:border-primary/50"
                />
              )}
              {f.hint && <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{f.hint}</p>}
            </div>
          ))}
        </div>

        <div className="pt-5 border-t border-border/50 flex items-center justify-end gap-3">
          {error && <span className="text-[13px] text-red-500 mr-auto">{error}</span>}
          {saved && <span className="text-[13px] text-emerald-600 flex items-center gap-1 mr-auto"><Check className="h-4 w-4" /> Saved</span>}
          <Button onClick={handleSave} disabled={saving} className="rounded-xl px-6 bg-primary text-primary-foreground font-bold shadow-md h-10">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Where the rest is managed — no dead placeholder tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/team" className="dash-card p-5 flex items-center gap-4 hover:border-primary/40 transition-colors group">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] text-foreground">Team & Founder</h3>
            <p className="text-[12px] text-muted-foreground">Manage team members and the About-page founder block.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </Link>
        <Link href="/website" className="dash-card p-5 flex items-center gap-4 hover:border-primary/40 transition-colors group">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[15px] text-foreground">Website Content</h3>
            <p className="text-[12px] text-muted-foreground">Edit hero copy, packages, pricing and page content.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </Link>
      </div>
    </div>
  );
}
