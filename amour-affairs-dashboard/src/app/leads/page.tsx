"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Search, Plus, Phone, Mail, Camera, Globe, Users, Loader2, X, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { leadsAPI, getStoredToken } from '@/lib/api';
import { decodeEntities } from '@/lib/utils';
import { leads as mockLeads } from '@/data/mockData';
import { Drawer } from '@/components/ui/Drawer';
import { motion, AnimatePresence } from 'framer-motion';

const LEAD_STAGES = ["New Inquiry", "Contacted", "Consultation Scheduled", "Proposal Sent", "Won", "Lost"] as const;
const LEAD_SOURCES = ["Website", "Instagram", "WhatsApp", "Google", "Referral", "Other"] as const;
const EVENT_TYPES = ["Wedding", "Pre-Wedding", "Couple Shoot", "Engagement", "Corporate", "Other"];

/* Shape returned by api/leads.php — website enquiries land here as
   source "Website" / stage "New Inquiry", with the visitor's message
   stored as the first note. */
interface LeadNote {
  content: string;
  author?: string;
  authorId?: string;
  date: string;
}

interface APILead {
  id: number;
  lead_ref: string;
  client_name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  event_type: string;
  event_date: string | null;
  budget_range: string | null;
  source: string;
  stage: string;
  last_activity: string | null;
  moved_to_stage_at: string | null;
  notes: LeadNote[];
  created_at: string;
}

// The bundled demo leads (camelCase) mapped into the API shape, used
// only in mock mode / when the API is unreachable.
const mockAsAPILeads: APILead[] = mockLeads.map((l, i) => ({
  id: i + 1,
  lead_ref: l.id,
  client_name: l.clientName,
  phone: l.phone,
  email: l.email,
  instagram: l.instagram || null,
  event_type: l.eventType,
  event_date: l.eventDate,
  budget_range: l.budgetRange,
  source: l.source,
  stage: l.stage,
  last_activity: l.lastActivity,
  moved_to_stage_at: l.movedToStageAt,
  notes: l.notes.map(n => ({ content: n.content, author: n.authorId, date: n.date })),
  created_at: l.movedToStageAt,
}));

const isMockMode = () => {
  const token = getStoredToken();
  return !token || token.startsWith("mock_");
};

// Decode once on load — visitor names/messages arrive HTML-encoded
// from the PHP sanitizer (e.g. "Priya &amp; Rahul", "We&apos;d love…")
const decodeLead = (l: APILead): APILead => ({
  ...l,
  client_name: decodeEntities(l.client_name),
  event_type: decodeEntities(l.event_type),
  budget_range: l.budget_range ? decodeEntities(l.budget_range) : l.budget_range,
  notes: (l.notes || []).map(n => ({
    ...n,
    content: decodeEntities(n.content),
    author: n.author ? decodeEntities(n.author) : n.author,
  })),
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const columnVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 350, damping: 28 } }
};

const cardContainerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
};

const cardItemVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 25 } }
};

interface LeadFormState {
  client_name: string;
  phone: string;
  email: string;
  event_type: string;
  event_date: string;
  budget_range: string;
  source: string;
  note: string;
}

const EMPTY_LEAD_FORM: LeadFormState = {
  client_name: "", phone: "", email: "", event_type: "Wedding",
  event_date: "", budget_range: "", source: "Other", note: "",
};

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<"Pipeline" | "List">("Pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<APILead | null>(null);
  const [leads, setLeads] = useState<APILead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [error, setError] = useState("");

  // Add-lead drawer
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<LeadFormState>(EMPTY_LEAD_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    if (isMockMode()) {
      setLeads(mockAsAPILeads);
      setUsingMockData(true);
      setIsLoading(false);
      return;
    }
    try {
      const res = await leadsAPI.list() as { leads: APILead[] };
      setLeads((res.leads || []).map(decodeLead));
      setUsingMockData(false);
    } catch {
      setLeads(mockAsAPILeads);
      setUsingMockData(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const filteredLeads = leads.filter(l =>
    l.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.lead_ref || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.phone || "").includes(searchQuery)
  );

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = leads.filter(l => l.created_at && new Date(l.created_at) >= monthStart);
    return [
      { label: "Total Leads", val: String(leads.length) },
      { label: "New Inquiries", val: String(leads.filter(l => l.stage === "New Inquiry").length) },
      { label: "From Website", val: String(leads.filter(l => l.source === "Website").length) },
      { label: "This Month", val: String(thisMonth.length) },
    ];
  }, [leads]);

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Instagram': return <Camera className="h-3 w-3" />;
      case 'WhatsApp': return <Phone className="h-3 w-3" />;
      case 'Website': return <Globe className="h-3 w-3" />;
      case 'Referral': return <Users className="h-3 w-3" />;
      default: return <Mail className="h-3 w-3" />;
    }
  };

  const getDaysInStage = (movedAt: string | null) => {
    if (!movedAt) return 0;
    const ms = new Date().getTime() - new Date(movedAt).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  };

  // ── Actions ──

  const handleStageChange = async (lead: APILead, stage: string) => {
    const prev = lead.stage;
    setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, stage, moved_to_stage_at: new Date().toISOString() } : l));
    setSelectedLead(s => s && s.id === lead.id ? { ...s, stage } : s);
    if (usingMockData) return;
    try {
      await leadsAPI.update(lead.id, { stage });
    } catch (err) {
      setLeads(ls => ls.map(l => l.id === lead.id ? { ...l, stage: prev } : l));
      setError(err instanceof Error ? err.message : "Failed to update stage");
    }
  };

  const handleDelete = async (lead: APILead) => {
    if (!confirm(`Delete lead ${lead.lead_ref} (${lead.client_name})? This cannot be undone.`)) return;
    try {
      if (!usingMockData) await leadsAPI.delete(lead.id);
      setLeads(ls => ls.filter(l => l.id !== lead.id));
      setSelectedLead(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleAddLead = async () => {
    if (!addForm.client_name.trim()) { setError("Client name is required"); return; }
    setIsSubmitting(true);
    setError("");
    try {
      const notes = addForm.note.trim()
        ? [{ content: addForm.note.trim(), author: "Dashboard", date: new Date().toISOString().slice(0, 19).replace("T", " ") }]
        : [];
      if (usingMockData) {
        setError("Connect to the live API to add leads — demo data is read-only.");
        return;
      }
      await leadsAPI.create({
        client_name: addForm.client_name.trim(),
        phone: addForm.phone.trim(),
        email: addForm.email.trim(),
        event_type: addForm.event_type,
        event_date: addForm.event_date || null,
        budget_range: addForm.budget_range.trim(),
        source: addForm.source,
        stage: "New Inquiry",
        notes,
      });
      setShowAddForm(false);
      setAddForm(EMPTY_LEAD_FORM);
      fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lead");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ──

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Track and convert your inquiries — website enquiry forms land here as &ldquo;New Inquiry&rdquo;.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-[240px] pl-9 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button onClick={() => { setAddForm(EMPTY_LEAD_FORM); setShowAddForm(true); }} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground border-none shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium flex items-center justify-between gap-3 shrink-0">
          <span className="break-words min-w-0">{error}</span>
          <button onClick={() => setError("")} className="shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}

      {usingMockData && !isLoading && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[13px] font-medium shrink-0">
          Showing demo leads — the live API is not connected. Website enquiries will appear here once it is.
        </div>
      )}

      {/* Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {stats.map(stat => (
          <div key={stat.label} className="dash-card p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
            <span className="text-xl font-bold text-foreground">{stat.val}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card/50 border border-border/50 p-1 rounded-xl w-max shrink-0 relative z-0">
        {(["Pipeline", "List"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 z-10 ${
              activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="leads-tab-active"
                className="absolute inset-0 bg-card shadow-sm rounded-lg -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {tab === "Pipeline" ? "Pipeline" : "List View"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === "Pipeline" ? (
            <motion.div
              key="pipeline"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={containerVariants}
              className="flex-1 overflow-x-auto min-h-[500px]"
            >
              <div className="flex gap-6 h-full pb-4 items-start w-max">
                {LEAD_STAGES.map(stage => {
                  const stageLeads = filteredLeads.filter(l => l.stage === stage);
                  return (
                    <motion.div
                      key={stage}
                      variants={columnVariants}
                      className="flex flex-col w-[300px] min-w-[300px] bg-muted/20 border border-border/20 rounded-xl p-3 h-full"
                    >
                      <div className="flex items-center justify-between px-2 mb-3">
                        <h3 className="font-bold text-[14px] text-foreground">{stage}</h3>
                        <span className="text-[12px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                      </div>

                      <motion.div
                        variants={cardContainerVariants}
                        className="flex flex-col gap-3"
                      >
                        {stageLeads.map(lead => {
                          const days = getDaysInStage(lead.moved_to_stage_at);
                          const isStale = days > 5;
                          const isCritical = days > 10;
                          const hasMessage = (lead.notes || []).length > 0;

                          return (
                            <motion.div
                              key={lead.id}
                              variants={cardItemVariants}
                              whileHover={{ y: -3, scale: 1.015, boxShadow: "0 10px 20px -10px rgba(0,0,0,0.06)" }}
                              whileTap={{ scale: 0.995 }}
                              onClick={() => setSelectedLead(lead)}
                              className="dash-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/20 text-primary text-[9px] font-bold">{lead.client_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-semibold text-[13px] text-foreground truncate max-w-[120px]">{lead.client_name}</span>
                                </div>
                                {hasMessage && <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                              </div>

                              <p className="text-[11px] text-muted-foreground font-medium mb-3">
                                {lead.event_type}
                                {lead.event_date ? ` • ${new Date(lead.event_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ""}
                              </p>

                              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-medium">
                                  {getSourceIcon(lead.source)} {lead.source}
                                </div>
                                <span className={`text-[10px] font-bold ${isCritical ? 'text-red-500' : isStale ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                  {days} days
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="dash-card overflow-x-auto"
            >
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/50">
                    {["Ref", "Client", "Contact", "Event", "Source", "Stage", "Received"].map(h => (
                      <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} onClick={() => setSelectedLead(lead)} className="border-b border-border/30 last:border-0 hover:bg-muted/30 cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-[12px] font-semibold text-muted-foreground whitespace-nowrap">{lead.lead_ref}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold text-foreground whitespace-nowrap">{lead.client_name}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground">
                        {[lead.phone, lead.email].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                        {lead.event_type}
                        {lead.event_date ? ` · ${new Date(lead.event_date).toLocaleDateString('en-IN')}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-medium">
                          {getSourceIcon(lead.source)} {lead.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-medium text-foreground whitespace-nowrap">{lead.stage}</td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : "—"}
                      </td>
                    </tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No leads found.</td></tr>
                  )}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Lead detail drawer */}
      <Drawer isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} title={selectedLead?.client_name || "Lead Details"}>
        {selectedLead && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-muted-foreground">{selectedLead.lead_ref}</span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded text-[11px] text-muted-foreground font-medium">
                {getSourceIcon(selectedLead.source)} {selectedLead.source}
              </span>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Stage</h4>
              <select
                value={selectedLead.stage}
                onChange={(e) => handleStageChange(selectedLead, e.target.value)}
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
              >
                {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact</h4>
              <div className="bg-muted/30 border border-border/50 p-4 rounded-xl space-y-2">
                {selectedLead.phone ? (
                  <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-[13px] text-foreground font-medium hover:text-primary">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selectedLead.phone}
                  </a>
                ) : null}
                {selectedLead.email ? (
                  <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-[13px] text-foreground font-medium hover:text-primary break-all">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {selectedLead.email}
                  </a>
                ) : null}
                {!selectedLead.phone && !selectedLead.email && (
                  <p className="text-[13px] text-muted-foreground">No contact details.</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Event Details</h4>
              <div className="bg-muted/30 border border-border/50 p-4 rounded-xl">
                <p className="text-[14px] text-foreground font-semibold">{selectedLead.event_type}</p>
                <p className="text-[12px] text-muted-foreground">
                  {selectedLead.event_date
                    ? `Planned: ${new Date(selectedLead.event_date).toLocaleDateString('en-IN')}`
                    : "No date shared yet"}
                </p>
                {selectedLead.budget_range ? (
                  <p className="text-[13px] text-primary font-bold mt-2">{selectedLead.budget_range}</p>
                ) : null}
              </div>
            </div>

            {(selectedLead.notes || []).length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Messages &amp; Notes</h4>
                <div className="space-y-3">
                  {selectedLead.notes.map((note, i) => (
                    <div key={i} className="bg-muted/30 border border-border/50 p-4 rounded-xl">
                      <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {note.author || note.authorId || "—"}
                        {note.date ? ` · ${new Date(note.date).toLocaleString('en-IN')}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => handleDelete(selectedLead)}
              className="w-full h-10 rounded-xl border border-red-500/20 text-red-500 text-sm font-bold hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete Lead
            </button>
          </div>
        )}
      </Drawer>

      {/* Add lead drawer */}
      <Drawer isOpen={showAddForm} onClose={() => setShowAddForm(false)} width="440px" title="Add Lead">
        <div className="p-6 space-y-5">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Client Name *</label>
            <input type="text" value={addForm.client_name} onChange={(e) => setAddForm(f => ({ ...f, client_name: e.target.value }))} placeholder="Priya & Rahul"
              className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Phone</label>
              <input type="tel" value={addForm.phone} onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91"
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Email</label>
              <input type="email" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))}
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Event Type</label>
              <select value={addForm.event_type} onChange={(e) => setAddForm(f => ({ ...f, event_type: e.target.value }))}
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50">
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Event Date</label>
              <input type="date" value={addForm.event_date} onChange={(e) => setAddForm(f => ({ ...f, event_date: e.target.value }))}
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Source</label>
              <select value={addForm.source} onChange={(e) => setAddForm(f => ({ ...f, source: e.target.value }))}
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50">
                {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Budget Range</label>
              <input type="text" value={addForm.budget_range} onChange={(e) => setAddForm(f => ({ ...f, budget_range: e.target.value }))} placeholder="₹1,00,000 – ₹1,50,000"
                className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Note (optional)</label>
            <textarea value={addForm.note} onChange={(e) => setAddForm(f => ({ ...f, note: e.target.value }))} rows={3} placeholder="How did this enquiry come in?"
              className="w-full p-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none" />
          </div>
          <Button onClick={handleAddLead} disabled={isSubmitting || !addForm.client_name.trim()} className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold">
            {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Add Lead"}
          </Button>
        </div>
      </Drawer>
    </div>
  );
}
