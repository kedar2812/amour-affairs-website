"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CalendarHeart, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { crmAPI } from "@/lib/api";
import { decodeEntities } from "@/lib/utils";
import { waLink } from "@/lib/phone";
import {
  ClientDate, CrmTemplates, OCCASION_META, OccasionType,
  composeGreeting, daysUntilLabel, nextOccurrenceOf, occasionTitle,
} from "@/lib/crm";
import { WhatsAppIcon } from "@/components/crm/WhatsAppIcon";

interface Props {
  clientId: number;
  clientName: string;
  /** Stored WhatsApp/phone number used for the greeting deep link. */
  phone: string;
}

const EMPTY_FORM = { occasion: "birthday" as OccasionType, who: "", date: "", yearKnown: true };

/**
 * The "Special Dates" tab of the client drawer: add / edit / remove the
 * client's birthdays, anniversary and kids' birthdays, and send a curated
 * WhatsApp greeting for any of them right from here.
 */
export function SpecialDatesEditor({ clientId, clientName, phone }: Props) {
  const [dates, setDates] = useState<ClientDate[]>([]);
  const [templates, setTemplates] = useState<CrmTemplates>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [sentIds, setSentIds] = useState<number[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [datesRes, tplRes] = await Promise.all([
        crmAPI.dates.list(clientId),
        crmAPI.templates.get(),
      ]);
      setDates((datesRes.dates || []) as ClientDate[]);
      setTemplates(tplRes.templates || {});
    } catch (e: unknown) {
      setError((e as Error)?.message || "Couldn't load special dates.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setFormOpen(true); };

  const openEdit = (d: ClientDate) => {
    setEditingId(d.id);
    setForm({
      occasion: d.occasion,
      who: decodeEntities(d.person_name || d.label || ""),
      date: d.occasion_date,
      yearKnown: Number(d.year_known) === 1,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.date) { setError("Please pick the date."); return; }
    setSaving(true);
    setError("");
    // A single "who" field keeps the form simple: it's the person's name for
    // birthdays, and the occasion label for anniversary/other entries.
    const isPerson = form.occasion === "birthday" || form.occasion === "kid_birthday";
    const payload = {
      client_id: clientId,
      occasion: form.occasion,
      person_name: isPerson ? form.who.trim() : "",
      label: isPerson ? "" : form.who.trim(),
      occasion_date: form.date,
      year_known: form.yearKnown,
    };
    try {
      if (editingId) await crmAPI.dates.update(editingId, payload);
      else await crmAPI.dates.create(payload);
      setFormOpen(false);
      await load();
    } catch (e: unknown) {
      setError((e as Error)?.message || "Couldn't save the date.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await crmAPI.dates.delete(id);
      setDates((prev) => prev.filter((d) => d.id !== id));
    } catch (e: unknown) {
      setError((e as Error)?.message || "Couldn't remove the date.");
    }
  };

  const handleSend = (d: ClientDate) => {
    const next = nextOccurrenceOf(d.occasion_date);
    const origYear = Number(d.occasion_date.slice(0, 4));
    const years = Number(d.year_known) === 1 && origYear > 1901 ? next.year - origYear : null;
    const message = composeGreeting(templates, {
      occasion: d.occasion,
      clientName,
      personName: d.person_name,
      label: d.label,
      years,
    });
    const link = waLink(phone, message);
    if (!link) { setError("This client has no phone number — add one to send WhatsApp wishes."); return; }
    window.open(link, "_blank", "noopener");
    setSentIds((prev) => [...prev, d.id]);
    // Best-effort log; the greeting itself has already been opened in WhatsApp.
    crmAPI.logSend({ client_date_id: d.id, occasion_year: next.year, message }).catch(() => {});
  };

  const inputCls = "w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-foreground text-[14px] focus:outline-none focus:border-primary/50";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Special Dates</h4>
        {!formOpen && (
          <Button variant="outline" onClick={openAdd} className="h-8 px-3 rounded-lg border-border/50 text-[12px]">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add date
          </Button>
        )}
      </div>

      {error && (
        <div className="text-[13px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
      )}

      {formOpen && (
        <div className="bg-muted/30 border border-border/50 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Occasion</label>
              <select
                value={form.occasion}
                onChange={(e) => setForm((p) => ({ ...p, occasion: e.target.value as OccasionType }))}
                className={inputCls}
              >
                {(Object.keys(OCCASION_META) as OccasionType[]).map((k) => (
                  <option key={k} value={k}>{OCCASION_META[k].emoji} {OCCASION_META[k].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
              {form.occasion === "birthday" || form.occasion === "kid_birthday" ? "Whose birthday?" : "What is the occasion?"}
            </label>
            <input
              value={form.who}
              onChange={(e) => setForm((p) => ({ ...p, who: e.target.value }))}
              placeholder={form.occasion === "kid_birthday" ? "e.g. Aarav" : form.occasion === "birthday" ? "e.g. Priya" : "e.g. Housewarming"}
              className={inputCls}
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={!form.yearKnown}
              onChange={(e) => setForm((p) => ({ ...p, yearKnown: !e.target.checked }))}
              className="h-4 w-4 rounded accent-[var(--primary)]"
            />
            Year unknown (only the day matters)
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="h-9 px-3 rounded-lg border-border/50">
              <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-bold">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
              {editingId ? "Save changes" : "Add date"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      ) : dates.length === 0 && !formOpen ? (
        <div className="flex flex-col items-center justify-center text-center py-10 gap-2">
          <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
            <CalendarHeart className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="text-[13px] font-semibold text-foreground">No special dates yet</p>
          <p className="text-[12px] text-muted-foreground max-w-[300px]">
            Add birthdays, the wedding anniversary and kids&apos; birthdays — you&apos;ll get a reminder here and on the dashboard when each one comes up.
          </p>
        </div>
      ) : (
        <div className="dash-card border border-border/50 rounded-xl divide-y divide-border/50">
          {dates.map((d) => {
            const next = nextOccurrenceOf(d.occasion_date);
            const origYear = Number(d.occasion_date.slice(0, 4));
            const years = Number(d.year_known) === 1 && origYear > 1901 ? next.year - origYear : null;
            const justSent = sentIds.includes(d.id);
            return (
              <div key={d.id} className="flex items-center gap-3 p-3">
                <span className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center text-[16px]">
                  {OCCASION_META[d.occasion]?.emoji || "✨"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground truncate">{occasionTitle(d)}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {next.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {" · "}{daysUntilLabel(next.days)}
                    {years != null && years > 0 ? ` · ${d.occasion === "anniversary" ? `${years} years` : `turns ${years}`}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleSend(d)}
                  title={justSent ? "Greeting opened in WhatsApp" : "Send WhatsApp wishes now"}
                  className={`h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[12px] font-bold transition-colors ${
                    justSent
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-[#25D366]/10 text-[#1DA851] border border-[#25D366]/25 hover:bg-[#25D366]/20"
                  }`}
                >
                  {justSent ? <Check className="h-3.5 w-3.5" /> : <WhatsAppIcon className="h-3.5 w-3.5" />}
                  {justSent ? "Sent" : "Wish"}
                </button>
                <button onClick={() => openEdit(d)} title="Edit" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(d.id)} title="Remove" className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
