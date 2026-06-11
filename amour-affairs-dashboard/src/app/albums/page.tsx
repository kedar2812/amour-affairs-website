"use client";

import React, { useState, useCallback } from "react";
import {
  Search, Plus, Upload, Trash2, X, Loader2, ArrowLeft,
  Pencil, ImagePlus, FolderOpen, GripVertical,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { albumsAPI, galleryAPI, assetUrl } from "@/lib/api";

const ALBUM_TYPES = [
  { value: "wedding", label: "Weddings" },
  { value: "couple_shoot", label: "Couple Shoots" },
  { value: "premium_album", label: "Premium Albums" },
];

const MAX_FILE_SIZE = 15 * 1024 * 1024;

interface AlbumPhoto {
  id: number;
  album_id: number;
  file_path: string;
  thumbnail_path: string;
  sort_order: number;
  is_active: number;
}

interface Album {
  id: number;
  type: string;
  couple: string;
  location: string;
  date_label: string;
  description: string;
  film_youtube_id: string | null;
  cover: string | null;
  cover_thumb: string | null;
  photo_count: number;
  sort_order: number;
  is_active: number;
  created_at: string;
  photos?: AlbumPhoto[];
}

interface AlbumFormState {
  type: string;
  couple: string;
  location: string;
  date_label: string;
  description: string;
  film_youtube_id: string;
}

const EMPTY_FORM: AlbumFormState = { type: "wedding", couple: "", location: "", date_label: "", description: "", film_youtube_id: "" };

const getTypeLabel = (val: string) => ALBUM_TYPES.find(t => t.value === val)?.label || val;

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeType, setActiveType] = useState("wedding");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Detail view — the album currently opened for photo management
  const [openAlbum, setOpenAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // Sequential photo upload queue
  const [uploadQueue, setUploadQueue] = useState<{ done: number; total: number } | null>(null);

  // Create / edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [form, setForm] = useState<AlbumFormState>(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // ── Data loading ──

  const fetchAlbums = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await albumsAPI.list({ type: activeType, all: true });
      setAlbums((res as { albums: Album[] }).albums || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load albums");
    } finally {
      setIsLoading(false);
    }
  }, [activeType]);

  React.useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const openAlbumDetail = async (album: Album) => {
    setOpenAlbum(album);
    setIsLoadingPhotos(true);
    try {
      const fresh = await albumsAPI.get(album.id) as Album;
      setOpenAlbum(fresh);
      setPhotos(fresh.photos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load album");
    } finally {
      setIsLoadingPhotos(false);
    }
  };

  const refreshOpenAlbum = async (albumId: number) => {
    const fresh = await albumsAPI.get(albumId) as Album;
    setOpenAlbum(fresh);
    setPhotos(fresh.photos || []);
  };

  const filteredAlbums = albums.filter(a =>
    a.couple.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.location || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Create / edit ──

  const openCreateModal = () => {
    setEditingAlbum(null);
    setForm({ ...EMPTY_FORM, type: activeType });
    setCoverFile(null);
    setCoverPreview("");
    setShowModal(true);
  };

  const openEditModal = (album: Album) => {
    setEditingAlbum(album);
    setForm({
      type: album.type,
      couple: album.couple,
      location: album.location || "",
      date_label: album.date_label || "",
      description: album.description || "",
      film_youtube_id: album.film_youtube_id ? `https://youtu.be/${album.film_youtube_id}` : "",
    });
    setCoverFile(null);
    setCoverPreview(album.cover_thumb ? assetUrl(album.cover_thumb) : "");
    setShowModal(true);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) { setError("Cover must be under 15MB"); return; }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.couple.trim()) { setError("Album title is required"); return; }
    setIsSaving(true);
    setError("");
    try {
      if (editingAlbum) {
        await albumsAPI.update(editingAlbum.id, { ...form });
        if (coverFile) {
          const fd = new FormData();
          fd.append("cover", coverFile);
          await albumsAPI.setCover(editingAlbum.id, fd);
        }
        if (openAlbum?.id === editingAlbum.id) await refreshOpenAlbum(editingAlbum.id);
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([key, value]) => fd.append(key, value));
        if (coverFile) fd.append("cover", coverFile);
        await albumsAPI.create(fd);
      }
      setShowModal(false);
      fetchAlbums();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Album actions ──

  const toggleActive = async (album: Album) => {
    try {
      await albumsAPI.update(album.id, { is_active: album.is_active ? 0 : 1 });
      setAlbums(prev => prev.map(a => a.id === album.id ? { ...a, is_active: a.is_active ? 0 : 1 } : a));
    } catch (err) { setError(err instanceof Error ? err.message : "Update failed"); }
  };

  const handleDeleteAlbum = async (album: Album) => {
    if (!confirm(`Delete "${album.couple}" and all ${album.photo_count} of its photos? This cannot be undone.`)) return;
    try {
      await albumsAPI.delete(album.id);
      setAlbums(prev => prev.filter(a => a.id !== album.id));
      if (openAlbum?.id === album.id) setOpenAlbum(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
  };

  const handleAlbumDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // Reorder over the full fetched list, not the search-filtered view,
    // so items hidden by the filter are never dropped from state.
    const oldIndex = albums.findIndex(a => a.id === active.id);
    const newIndex = albums.findIndex(a => a.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(albums, oldIndex, newIndex);
    setAlbums(reordered);
    try {
      await albumsAPI.reorder(reordered.map((a, i) => ({ id: a.id, sort_order: i + 1 })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
      fetchAlbums();
    }
  };

  // ── Photo actions (detail view) ──

  // Upload one file per request: keeps each request small (shared-hosting
  // post limits), gives real progress, and lets one bad file fail alone.
  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || !openAlbum) return;

    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length) {
      setError(`These files exceed 15MB: ${oversized.map(f => f.name).join(", ")}`);
      return;
    }

    setError("");
    setUploadQueue({ done: 0, total: files.length });
    const failures: string[] = [];

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("photos[]", file);
        await albumsAPI.addPhotos(openAlbum.id, fd);
      } catch (err) {
        failures.push(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      }
      setUploadQueue(prev => prev ? { ...prev, done: prev.done + 1 } : prev);
    }

    setUploadQueue(null);
    try { await refreshOpenAlbum(openAlbum.id); } catch { /* list refresh below still runs */ }
    fetchAlbums();
    if (failures.length) {
      setError(`${failures.length} of ${files.length} photos failed — ${failures.join("; ")}`);
    }
  };

  const handleDeletePhoto = async (photo: AlbumPhoto) => {
    if (!confirm("Delete this photo?")) return;
    try {
      await galleryAPI.delete(photo.id);
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      fetchAlbums();
    } catch (err) { setError(err instanceof Error ? err.message : "Delete failed"); }
  };

  const handlePhotoDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex(p => p.id === active.id);
    const newIndex = photos.findIndex(p => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(photos, oldIndex, newIndex);
    setPhotos(reordered);
    try {
      await galleryAPI.reorder(reordered.map((p, i) => ({ id: p.id, sort_order: i + 1 })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
      if (openAlbum) refreshOpenAlbum(openAlbum.id);
    }
  };

  // ── Render ──

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          {openAlbum ? (
            <>
              <button onClick={() => setOpenAlbum(null)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-2">
                <ArrowLeft className="h-4 w-4" /> All {getTypeLabel(openAlbum.type)}
              </button>
              <h1 className="text-3xl font-bold text-foreground">{openAlbum.couple}</h1>
              <p className="text-[14px] text-muted-foreground mt-1">
                {[openAlbum.location, openAlbum.date_label].filter(Boolean).join(" · ") || "Manage this album's photos."}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground">Albums</h1>
              <p className="text-[14px] text-muted-foreground mt-1">Wedding, couple shoot and premium album archives shown on the website.</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {openAlbum ? (
            <>
              <Button onClick={() => openEditModal(openAlbum)} variant="outline" className="h-10 px-4 rounded-xl">
                <Pencil className="h-4 w-4 mr-2" /> Edit Details
              </Button>
              <label className={`inline-flex items-center h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium shadow-sm ${uploadQueue ? "opacity-60 pointer-events-none" : "cursor-pointer hover:opacity-90"}`}>
                <ImagePlus className="h-4 w-4 mr-2" /> Add Photos
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} disabled={!!uploadQueue} />
              </label>
            </>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Search albums..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-[220px] pl-9 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <Button onClick={openCreateModal} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground border-none shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> New Album
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center justify-between gap-3">
          <span className="break-words min-w-0">{error}</span>
          <button onClick={() => setError("")} className="shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Upload progress */}
      {uploadQueue && (
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Uploading photos… {uploadQueue.done} of {uploadQueue.total}
            </span>
            <span className="text-sm text-muted-foreground">{Math.round((uploadQueue.done / uploadQueue.total) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${(uploadQueue.done / uploadQueue.total) * 100}%` }} />
          </div>
        </div>
      )}

      {openAlbum ? (
        /* ═══════════ DETAIL VIEW — photo grid ═══════════ */
        isLoadingPhotos ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold text-foreground">No photos in this album yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add photos — the first one becomes the cover automatically.</p>
            <label className="mt-4 inline-flex items-center h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90">
              <ImagePlus className="h-4 w-4 mr-2" /> Add Photos
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleAddPhotos} />
            </label>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-muted-foreground -mt-2">
              {photos.length} photo{photos.length === 1 ? "" : "s"} — drag to set the order they appear on the website.
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handlePhotoDragEnd}>
              <SortableContext items={photos.map(p => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 pb-12">
                  {photos.map(photo => (
                    <SortablePhotoCard key={photo.id} photo={photo} onDelete={() => handleDeletePhoto(photo)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )
      ) : (
        /* ═══════════ LIST VIEW — album grid ═══════════ */
        <>
          <div className="flex items-center gap-1 bg-card/50 border border-border/50 p-1 rounded-xl w-max">
            {ALBUM_TYPES.map(t => (
              <button key={t.value} onClick={() => setActiveType(t.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeType === t.value ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : filteredAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-semibold text-foreground">No {getTypeLabel(activeType).toLowerCase()} albums yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create an album, then fill it with photos.</p>
              <Button onClick={openCreateModal} className="mt-4 rounded-xl bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" /> New Album
              </Button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleAlbumDragEnd}>
              <SortableContext items={filteredAlbums.map(a => a.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-12">
                  {filteredAlbums.map(album => (
                    <SortableAlbumCard
                      key={album.id}
                      album={album}
                      onOpen={() => openAlbumDetail(album)}
                      onEdit={() => openEditModal(album)}
                      onDelete={() => handleDeleteAlbum(album)}
                      onToggleActive={() => toggleActive(album)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-[560px] border border-border/50 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-border/50 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{editingAlbum ? "Edit Album" : "New Album"}</h2>
              <button onClick={() => setShowModal(false)} className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Collection</label>
                  <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50">
                    {ALBUM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Album Title *</label>
                  <input type="text" value={form.couple} onChange={(e) => setForm(f => ({ ...f, couple: e.target.value }))} placeholder="Aarohi & Vedant"
                    className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Pune"
                    className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Date Label</label>
                  <input type="text" value={form.date_label} onChange={(e) => setForm(f => ({ ...f, date_label: e.target.value }))} placeholder="December 2025"
                    className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Description</label>
                <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  placeholder="A two-day celebration at a heritage wada…"
                  className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none" />
              </div>
              {form.type === "wedding" && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                    Wedding Film (optional)
                  </label>
                  <input type="text" value={form.film_youtube_id} onChange={(e) => setForm(f => ({ ...f, film_youtube_id: e.target.value }))}
                    placeholder="Paste a YouTube link, e.g. https://youtu.be/abc123…"
                    className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
                  <p className="text-[11px] text-muted-foreground mt-1.5">Shown inside this folder on the Weddings page. Paste a YouTube link or video ID — leave blank for no film.</p>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Cover Image {editingAlbum ? "(replace)" : "(optional — first photo is used if empty)"}
                </label>
                <label className="block cursor-pointer">
                  <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${coverPreview ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"}`}>
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover preview" className="max-h-[160px] mx-auto rounded-lg object-contain" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-[12px] text-muted-foreground">JPEG, PNG, WebP — max 15MB</p>
                      </>
                    )}
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
                </label>
              </div>
              <Button onClick={handleSave} disabled={isSaving || !form.couple.trim()} className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold">
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : editingAlbum ? "Save Changes" : "Create Album"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ── Sortable album card ── */
function SortableAlbumCard({ album, onOpen, onEdit, onDelete, onToggleActive }: {
  album: Album;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: album.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style}
      className={`dash-card overflow-hidden group ${isDragging ? "z-10 shadow-2xl opacity-90" : ""} ${!album.is_active ? "opacity-50" : ""}`}>
      <button onClick={onOpen} className="block w-full aspect-[3/2] bg-muted overflow-hidden relative cursor-pointer text-left">
        {album.cover_thumb || album.cover ? (
          <img src={assetUrl(album.cover_thumb || album.cover)} alt={album.couple}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-semibold">
          {album.photo_count} photo{album.photo_count === 1 ? "" : "s"}
        </span>
      </button>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onOpen} className="min-w-0 text-left cursor-pointer">
            <p className="text-[15px] font-bold text-foreground truncate">{album.couple}</p>
            <p className="text-[12px] text-muted-foreground truncate mt-0.5">
              {[album.location, album.date_label].filter(Boolean).join(" · ") || "—"}
            </p>
          </button>
          <span {...attributes} {...listeners} className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted cursor-grab active:cursor-grabbing" title="Drag to reorder">
            <GripVertical className="h-4 w-4" />
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <button onClick={onToggleActive}
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${album.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-500/10 text-slate-400"}`}>
            {album.is_active ? "Live" : "Hidden"}
          </button>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit album">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={onDelete} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-500/10 hover:text-red-500" title="Delete album">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── Sortable photo card ── */
function SortablePhotoCard({ photo, onDelete }: { photo: AlbumPhoto; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      className={`dash-card overflow-hidden group relative cursor-grab active:cursor-grabbing ${isDragging ? "z-10 shadow-2xl opacity-90" : ""}`}>
      <div className="aspect-square bg-muted overflow-hidden">
        <img src={assetUrl(photo.thumbnail_path || photo.file_path)} alt=""
          className="w-full h-full object-cover" loading="lazy" draggable={false} />
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-2 right-2 h-8 w-8 rounded-lg bg-white/90 text-foreground hover:bg-red-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
        title="Delete photo">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
