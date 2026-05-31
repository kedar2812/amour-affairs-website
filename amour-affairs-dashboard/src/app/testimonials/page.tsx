"use client";

import React, { useState, useCallback } from "react";
import { Search, Plus, Trash2, Star, X, Loader2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/Drawer";
import { testimonialsAPI } from "@/lib/api";

interface Testimonial {
  id: number;
  client_name: string;
  event_type: string;
  event_date: string | null;
  review_text: string;
  rating: number;
  photo_path: string | null;
  city: string;
  is_featured: number;
  is_active: number;
  sort_order: number;
  created_at: string;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formText, setFormText] = useState("");
  const [formType, setFormType] = useState("Wedding");
  const [formCity, setFormCity] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formFeatured, setFormFeatured] = useState(false);
  const [formDate, setFormDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTestimonials = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await testimonialsAPI.list({ all: true });
      setTestimonials((res as { testimonials: Testimonial[] }).testimonials || []);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to load"); }
    finally { setIsLoading(false); }
  }, []);

  React.useEffect(() => { fetchTestimonials(); }, [fetchTestimonials]);

  const filtered = testimonials.filter(t =>
    t.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.review_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreate = () => {
    setEditingId(null);
    setFormName(""); setFormText(""); setFormType("Wedding");
    setFormCity(""); setFormRating(5); setFormFeatured(false); setFormDate("");
    setShowForm(true);
  };

  const openEdit = (t: Testimonial) => {
    setEditingId(t.id);
    setFormName(t.client_name); setFormText(t.review_text); setFormType(t.event_type);
    setFormCity(t.city || ""); setFormRating(t.rating); setFormFeatured(!!t.is_featured);
    setFormDate(t.event_date || "");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formText.trim()) { setError("Name and review text are required"); return; }
    setIsSubmitting(true);
    setError("");
    try {
      if (editingId) {
        await testimonialsAPI.update(editingId, {
          client_name: formName, review_text: formText, event_type: formType,
          city: formCity, rating: formRating, is_featured: formFeatured ? 1 : 0,
          event_date: formDate || null,
        });
      } else {
        const formData = new FormData();
        formData.append("client_name", formName);
        formData.append("review_text", formText);
        formData.append("event_type", formType);
        formData.append("city", formCity);
        formData.append("rating", String(formRating));
        formData.append("is_featured", formFeatured ? "1" : "0");
        if (formDate) formData.append("event_date", formDate);
        await testimonialsAPI.create(formData);
      }
      setShowForm(false);
      fetchTestimonials();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (t: Testimonial) => {
    if (!confirm(`Delete testimonial from "${t.client_name}"?`)) return;
    try { await testimonialsAPI.delete(t.id); setTestimonials(prev => prev.filter(i => i.id !== t.id)); }
    catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
  };

  const toggleFeatured = async (t: Testimonial) => {
    try {
      await testimonialsAPI.update(t.id, { is_featured: t.is_featured ? 0 : 1 });
      setTestimonials(prev => prev.map(i => i.id === t.id ? { ...i, is_featured: i.is_featured ? 0 : 1 } : i));
    } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Testimonials</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Manage client reviews for your website.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-[220px] pl-9 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <Button onClick={openCreate} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground border-none shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> Add Testimonial
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center justify-between">
          {error}<button onClick={() => setError("")}><X className="h-4 w-4" /></button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-semibold text-foreground">No testimonials yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first client review.</p>
          <Button onClick={openCreate} className="mt-4 rounded-xl bg-primary text-primary-foreground"><Plus className="h-4 w-4 mr-2" /> Add Testimonial</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
          {filtered.map(t => (
            <div key={t.id} className="dash-card p-6 flex flex-col h-full group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < t.rating ? "text-amber-500" : "text-border"}`} fill={i < t.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleFeatured(t)} className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${t.is_featured ? "bg-amber-500/10 text-amber-500" : "hover:bg-muted text-muted-foreground"}`}>
                    <Star className="h-3.5 w-3.5" fill={t.is_featured ? "currentColor" : "none"} />
                  </button>
                  <button onClick={() => openEdit(t)} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(t)} className="h-7 w-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-muted-foreground hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[14px] text-foreground leading-relaxed flex-1 line-clamp-4">&ldquo;{t.review_text}&rdquo;</p>
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">{t.client_name}</p>
                  <p className="text-[12px] text-muted-foreground">{t.event_type}{t.city ? ` · ${t.city}` : ""}</p>
                </div>
                {t.is_featured ? <span className="text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">Featured</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Drawer */}
      <Drawer isOpen={showForm} onClose={() => setShowForm(false)} width="440px" title={editingId ? "Edit Testimonial" : "Add Testimonial"}>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Client Name *</label>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Priya & Rahul"
              className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Review Text *</label>
            <textarea value={formText} onChange={(e) => setFormText(e.target.value)} rows={4} placeholder="Their review..."
              className="w-full p-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Event Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value)}
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50">
                <option>Wedding</option><option>Pre-Wedding</option><option>Corporate</option><option>Portrait</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">City</label>
              <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="Pune"
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Rating</label>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button key={i} onClick={() => setFormRating(i + 1)} className="p-1">
                    <Star className={`h-5 w-5 ${i < formRating ? "text-amber-500" : "text-border"}`} fill={i < formRating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Event Date</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formFeatured} onChange={(e) => setFormFeatured(e.target.checked)} className="rounded border-border" />
            <span className="text-sm font-medium text-foreground">Show on homepage (Featured)</span>
          </label>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold">
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : editingId ? "Save Changes" : "Add Testimonial"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
