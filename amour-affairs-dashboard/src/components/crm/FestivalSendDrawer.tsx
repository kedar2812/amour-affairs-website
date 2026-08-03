"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { crmAPI } from "@/lib/api";
import { useClients } from "@/lib/useData";
import { waLink, formatPhone } from "@/lib/phone";
import { CrmTemplates, UpcomingFestival, composeGreeting, daysUntilLabel } from "@/lib/crm";
import { decodeEntities } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/crm/WhatsAppIcon";

interface Props {
  festival: UpcomingFestival | null;
  templates: CrmTemplates;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Festival greeting run: every client listed with a one-tap WhatsApp send.
 * Sent clients are ticked off (persisted per festival + year via the API),
 * so the studio can work through the list across several sittings.
 */
export function FestivalSendDrawer({ festival, templates, isOpen, onClose }: Props) {
  const { data: clients, isLoading } = useClients();
  const [sentIds, setSentIds] = useState<number[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!festival || !isOpen) return;
    setLoadingSent(true);
    setQuery("");
    crmAPI.greetings(festival.id, festival.occasion_year)
      .then((res) => setSentIds(res.client_ids || []))
      .catch(() => setSentIds([]))
      .finally(() => setLoadingSent(false));
  }, [festival, isOpen]);

  const rows = useMemo(() => {
    const list = (clients as { dbId?: number; id: number | string; name: string; phone: string; whatsapp: string }[])
      .map((c) => ({
        id: Number(c.dbId ?? c.id),
        name: c.name || "Unnamed client",
        phone: c.whatsapp || c.phone || "",
      }))
      .filter((c) => Number.isFinite(c.id) && c.id > 0);
    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;
    // Unsent first so the remaining work floats to the top
    return filtered.sort((a, b) => Number(sentIds.includes(a.id)) - Number(sentIds.includes(b.id)));
  }, [clients, query, sentIds]);

  const handleSend = (client: { id: number; name: string; phone: string }) => {
    if (!festival) return;
    const message = composeGreeting(templates, {
      occasion: "festival",
      clientName: client.name,
      festivalName: festival.name,
      festivalTemplate: festival.message_template,
    });
    const link = waLink(client.phone, message);
    if (!link) return;
    window.open(link, "_blank", "noopener");
    setSentIds((prev) => (prev.includes(client.id) ? prev : [...prev, client.id]));
    crmAPI.logSend({
      festival_id: festival.id,
      client_id: client.id,
      occasion_year: festival.occasion_year,
      message,
    }).catch(() => {});
  };

  const sentCount = rows.filter((r) => sentIds.includes(r.id)).length;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} width="480px" title={festival ? `${festival.emoji || "✨"} ${decodeEntities(festival.name)} wishes` : "Festival wishes"}>
      {festival && (
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-border/50 space-y-3 shrink-0">
            <p className="text-[13px] text-muted-foreground">
              {new Date(festival.next_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              {" · "}
              <span className="font-semibold text-foreground">{daysUntilLabel(festival.days_until)}</span>
              {" · "}{sentCount}/{rows.length} wished
            </p>
            {Number(festival.is_movable) === 1 && (
              <p className="text-[12px] text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                This festival moves each year — confirm the date in Festivals &amp; Wishes settings.
              </p>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients…"
                className="w-full h-10 pl-9 pr-3 bg-muted/30 border border-border/50 rounded-lg text-foreground text-[14px] focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading || loadingSent ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <p className="text-[13px] text-muted-foreground text-center py-12">No clients found.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {rows.map((c) => {
                  const sent = sentIds.includes(c.id);
                  const hasPhone = !!c.phone;
                  return (
                    <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground truncate">{c.name}</p>
                        <p className="text-[12px] text-muted-foreground font-mono truncate">
                          {hasPhone ? formatPhone(c.phone) : "No phone number"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSend(c)}
                        disabled={!hasPhone}
                        className={`h-8 px-3 rounded-lg flex items-center gap-1.5 text-[12px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          sent
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-[#25D366]/10 text-[#1DA851] border border-[#25D366]/25 hover:bg-[#25D366]/20"
                        }`}
                        title={!hasPhone ? "Add a phone number to this client first" : sent ? "Already wished — send again" : "Open WhatsApp with the greeting"}
                      >
                        {sent ? <Check className="h-3.5 w-3.5" /> : <WhatsAppIcon className="h-3.5 w-3.5" />}
                        {sent ? "Wished" : "Send"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
