"use client";

import React, { useState, useCallback } from "react";
import { Loader2, X, Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsAPI, getStoredToken } from "@/lib/api";
import { decodeEntities } from "@/lib/utils";

/* ============================================================
   WEBSITE CONTENT — dashboard-editable page copy
   Edits the `site_content` settings group consumed by the
   public website (src/js/site-content.js):
   · the enquiry section inside Weddings folders
   · the enquiry section inside Couple Shoots folders
   · the three couple-shoot session packages
   The website falls back to identical bundled defaults when a
   key is missing, so partial saves can never break a page.
   ============================================================ */

interface PackageRow { label: string; value: string }
interface SessionPackage { name: string; tagline: string; rows: PackageRow[] }

interface EnquiryCopy { label: string; title: string; text: string; button: string }

const DEFAULT_WEDDINGS_ENQ: EnquiryCopy = {
  label: "Begin Your Story",
  title: "Book Your *Wedding*",
  text:
    "Loved what you found in this folder? Tell us about your celebration and " +
    "we’ll get back within 24 hours — with ideas, availability and a fair quote.",
  button: "Send Inquiry",
};

const DEFAULT_COUPLE_ENQ: EnquiryCopy = {
  label: "Your Story, Before The Wedding",
  title: "Book Your *Couple Shoot*",
  text:
    "Pictured yourselves in one of these folders? Share a few details about " +
    "the two of you and we’ll get back within 24 hours with dates, locations and ideas.",
  button: "Send Inquiry",
};

const DEFAULT_PKG_EYEBROW = "What to Expect";
const DEFAULT_PKG_HEADING = "Choose Your *Session*";

const DEFAULT_PACKAGES: SessionPackage[] = [
  {
    name: "The Stills Collection",
    tagline: "Photographs only",
    rows: [
      { label: "Coverage", value: "2–3 hours" },
      { label: "Deliverables", value: "80–120 fully edited images" },
      { label: "Turnaround", value: "2–3 weeks" },
      { label: "Locations", value: "Pune + outstation on request" },
      { label: "Outfit Changes", value: "Up to 2 included" },
    ],
  },
  {
    name: "The Cinema Collection",
    tagline: "A cinematic couple film",
    rows: [
      { label: "Coverage", value: "2–3 hours" },
      { label: "Deliverables", value: "A 60–90 second cinematic film" },
      { label: "Turnaround", value: "3–4 weeks" },
      { label: "Locations", value: "Pune + outstation on request" },
      { label: "Outfit Changes", value: "Up to 2 included" },
    ],
  },
  {
    name: "The Signature Collection",
    tagline: "Photographs + cinematic film",
    rows: [
      { label: "Coverage", value: "4–5 hours" },
      { label: "Deliverables", value: "80–120 edited images + cinematic film" },
      { label: "Turnaround", value: "3–4 weeks" },
      { label: "Locations", value: "Pune + outstation on request" },
      { label: "Outfit Changes", value: "Up to 3 included" },
    ],
  },
];

const isMockMode = () => {
  const token = getStoredToken();
  return !token || token.startsWith("mock_");
};

/* ── Small shared inputs ── */

function Field({ label, value, onChange, hint, textarea }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string; textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3}
          className="w-full p-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
      )}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function EnquiryEditor({ copy, onChange }: { copy: EnquiryCopy; onChange: (c: EnquiryCopy) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Eyebrow Label" value={copy.label} onChange={(v) => onChange({ ...copy, label: v })} />
        <Field label="Heading" value={copy.title} onChange={(v) => onChange({ ...copy, title: v })}
          hint="Wrap a word in *asterisks* for the italic accent, e.g. Book Your *Wedding*" />
      </div>
      <Field label="Intro Text" value={copy.text} onChange={(v) => onChange({ ...copy, text: v })} textarea />
      <Field label="Submit Button Label" value={copy.button} onChange={(v) => onChange({ ...copy, button: v })} />
    </div>
  );
}

export default function WebsiteContentPage() {
  const [weddingsEnq, setWeddingsEnq] = useState<EnquiryCopy>(DEFAULT_WEDDINGS_ENQ);
  const [coupleEnq, setCoupleEnq] = useState<EnquiryCopy>(DEFAULT_COUPLE_ENQ);
  const [pkgEyebrow, setPkgEyebrow] = useState(DEFAULT_PKG_EYEBROW);
  const [pkgHeading, setPkgHeading] = useState(DEFAULT_PKG_HEADING);
  const [packages, setPackages] = useState<SessionPackage[]>(DEFAULT_PACKAGES);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [mockMode, setMockMode] = useState(false);

  const fetchContent = useCallback(async () => {
    setIsLoading(true);
    if (isMockMode()) {
      setMockMode(true);
      setIsLoading(false);
      return;
    }
    try {
      const res = await settingsAPI.getGroup("site_content") as { settings: Record<string, string> };
      const s: Record<string, string> = {};
      Object.entries(res.settings || {}).forEach(([k, v]) => { s[k] = decodeEntities(v || ""); });

      setWeddingsEnq({
        label: s.site_weddings_enq_label || DEFAULT_WEDDINGS_ENQ.label,
        title: s.site_weddings_enq_title || DEFAULT_WEDDINGS_ENQ.title,
        text: s.site_weddings_enq_text || DEFAULT_WEDDINGS_ENQ.text,
        button: s.site_weddings_enq_button || DEFAULT_WEDDINGS_ENQ.button,
      });
      setCoupleEnq({
        label: s.site_couple_enq_label || DEFAULT_COUPLE_ENQ.label,
        title: s.site_couple_enq_title || DEFAULT_COUPLE_ENQ.title,
        text: s.site_couple_enq_text || DEFAULT_COUPLE_ENQ.text,
        button: s.site_couple_enq_button || DEFAULT_COUPLE_ENQ.button,
      });
      setPkgEyebrow(s.site_couple_pkg_eyebrow || DEFAULT_PKG_EYEBROW);
      setPkgHeading(s.site_couple_pkg_heading || DEFAULT_PKG_HEADING);
      if (s.site_couple_packages_json) {
        try {
          const parsed = JSON.parse(s.site_couple_packages_json);
          if (parsed && Array.isArray(parsed.packages) && parsed.packages.length > 0) {
            setPackages(parsed.packages);
          }
        } catch { /* keep defaults on malformed JSON */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load website content");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchContent(); }, [fetchContent]);

  const updatePackage = (i: number, pkg: SessionPackage) => {
    setPackages(prev => prev.map((p, idx) => idx === i ? pkg : p));
  };

  const updateRow = (pkgIdx: number, rowIdx: number, row: PackageRow) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, rows: p.rows.map((r, j) => j === rowIdx ? row : r) } : p
    ));
  };

  const addRow = (pkgIdx: number) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, rows: [...p.rows, { label: "", value: "" }] } : p
    ));
  };

  const removeRow = (pkgIdx: number, rowIdx: number) => {
    setPackages(prev => prev.map((p, i) =>
      i === pkgIdx ? { ...p, rows: p.rows.filter((_, j) => j !== rowIdx) } : p
    ));
  };

  const handleSave = async () => {
    if (mockMode) {
      setError("Connect to the live API to save — demo mode is read-only.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const cleanedPackages = packages
        .map(p => ({
          name: p.name.trim(),
          tagline: p.tagline.trim(),
          rows: p.rows.filter(r => r.label.trim() && r.value.trim()),
        }))
        .filter(p => p.name);

      if (cleanedPackages.length === 0) {
        setError("At least one package needs a name.");
        return;
      }

      await settingsAPI.update({
        site_weddings_enq_label: weddingsEnq.label.trim(),
        site_weddings_enq_title: weddingsEnq.title.trim(),
        site_weddings_enq_text: weddingsEnq.text.trim(),
        site_weddings_enq_button: weddingsEnq.button.trim(),
        site_couple_enq_label: coupleEnq.label.trim(),
        site_couple_enq_title: coupleEnq.title.trim(),
        site_couple_enq_text: coupleEnq.text.trim(),
        site_couple_enq_button: coupleEnq.button.trim(),
        site_couple_pkg_eyebrow: pkgEyebrow.trim(),
        site_couple_pkg_heading: pkgHeading.trim(),
        site_couple_packages_json: JSON.stringify({ packages: cleanedPackages }),
      });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1100px] mx-auto w-full pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Website Content</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Edit the enquiry sections inside the Weddings &amp; Couple Shoots folders and the couple-shoot session packages.
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || isLoading} className="h-10 px-6 rounded-xl bg-primary text-primary-foreground font-bold shadow-sm">
          {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
            : savedAt ? <><Check className="h-4 w-4 mr-2" /> Saved</>
            : "Save All Changes"}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center justify-between gap-3">
          <span className="break-words min-w-0">{error}</span>
          <button onClick={() => setError("")} className="shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}

      {mockMode && !isLoading && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[13px] font-medium">
          Demo mode — showing the website&apos;s built-in defaults. Connect to the live API to edit and save.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
      ) : (
        <>
          {/* Weddings enquiry */}
          <div className="dash-card p-6 md:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Weddings — Folder Enquiry</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Shown at the end of every opened wedding folder, after &ldquo;Continue Browsing&rdquo;.
              </p>
            </div>
            <EnquiryEditor copy={weddingsEnq} onChange={setWeddingsEnq} />
          </div>

          {/* Couple shoots enquiry */}
          <div className="dash-card p-6 md:p-8 space-y-5">
            <div>
              <h2 className="text-lg font-bold text-foreground">Couple Shoots — Folder Enquiry</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Shown at the end of every opened couple-shoot folder, after &ldquo;Continue Browsing&rdquo;.
              </p>
            </div>
            <EnquiryEditor copy={coupleEnq} onChange={setCoupleEnq} />
          </div>

          {/* Session packages */}
          <div className="dash-card p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Couple Shoots — Session Packages</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                The three offering cards in the &ldquo;What to Expect&rdquo; section: photographs only,
                cinematic film only, and photographs + film. No pricing is shown on the website.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Section Eyebrow" value={pkgEyebrow} onChange={setPkgEyebrow} />
              <Field label="Section Heading" value={pkgHeading} onChange={setPkgHeading}
                hint="Wrap a word in *asterisks* for the italic accent, e.g. Choose Your *Session*" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {packages.map((pkg, i) => (
                <div key={i} className="border border-border/50 rounded-xl p-5 space-y-4 bg-muted/10">
                  <Field label={`Package ${i + 1} — Name`} value={pkg.name} onChange={(v) => updatePackage(i, { ...pkg, name: v })} />
                  <Field label="Tagline" value={pkg.tagline} onChange={(v) => updatePackage(i, { ...pkg, tagline: v })} />

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Detail Rows</label>
                    <div className="space-y-2">
                      {pkg.rows.map((row, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <input type="text" value={row.label} placeholder="Label" onChange={(e) => updateRow(i, j, { ...row, label: e.target.value })}
                            className="w-[30%] h-9 px-2.5 bg-muted/30 border border-border/50 rounded-lg text-[13px] text-foreground focus:outline-none focus:border-primary/50" />
                          <input type="text" value={row.value} placeholder="Value" onChange={(e) => updateRow(i, j, { ...row, value: e.target.value })}
                            className="flex-1 h-9 px-2.5 bg-muted/30 border border-border/50 rounded-lg text-[13px] text-foreground focus:outline-none focus:border-primary/50" />
                          <button onClick={() => removeRow(i, j)} title="Remove row"
                            className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addRow(i)}
                      className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:opacity-80 transition-opacity">
                      <Plus className="h-3.5 w-3.5" /> Add Row
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
