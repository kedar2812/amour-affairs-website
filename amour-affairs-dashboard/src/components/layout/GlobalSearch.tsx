"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Phone, Briefcase, User, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useBookings, useClients, useLeads } from "@/lib/useData";

type SearchResultItem = {
  id: string;
  title: string;
  subtitle: string;
  type: "Booking" | "Client" | "Lead";
  route: string;
  icon: any;
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSimulatingLoad, setIsSimulatingLoad] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Live data (real API when authenticated, mock fallback otherwise)
  const { data: bookings } = useBookings();
  const { data: clients } = useClients();
  const { data: leads } = useLeads();

  // Focus shortcuts (Cmd+F / Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Clickaway listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Simulate API delay locally for realism when querying
  useEffect(() => {
    if (query.trim() === "") {
        setIsSimulatingLoad(false);
        return;
    }
    setIsOpen(true);
    setIsSimulatingLoad(true);
    const timer = setTimeout(() => {
        setIsSimulatingLoad(false);
    }, 300); // 300ms fake network delay
    return () => clearTimeout(timer);
  }, [query]);

  // Command Palette Multi-Dataset Search Engine.
  // The live API returns snake_case fields while the mock data is camelCase, and
  // any field can be null — so read every field defensively (`s()` coerces
  // null/undefined to "") and accept either casing. This is what was crashing
  // the whole page ("This page couldn't load") on a real keystroke.
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const s = (v: unknown) => (v == null ? "" : String(v)).toLowerCase();
    const pick = (o: any, ...keys: string[]) => {
      for (const k of keys) if (o?.[k] != null && o[k] !== "") return o[k];
      return "";
    };

    // Search Bookings (Limit 4)
    const matchedBookings = (bookings as any[]).map(b => ({
      id: String(pick(b, "id", "booking_ref", "ref")),
      name: pick(b, "clientName", "client_name"),
      event: pick(b, "eventType", "event_type"),
      venue: pick(b, "venue"),
      city: pick(b, "city"),
    })).filter(b =>
      s(b.name).includes(q) || s(b.id).includes(q) || s(b.venue).includes(q) || s(b.city).includes(q)
    ).slice(0, 4).map(b => ({
      id: `b-${b.id}`,
      title: `${b.name}${b.event ? " - " + b.event : ""}`,
      subtitle: [b.id, [b.venue, b.city].filter(Boolean).join(", ")].filter(Boolean).join(" • "),
      type: "Booking" as const, route: "/bookings", icon: Briefcase
    }));

    // Search Clients (Limit 3)
    const matchedClients = (clients as any[]).map(c => ({
      id: String(pick(c, "id")),
      name: pick(c, "name"),
      email: pick(c, "email"),
      phone: pick(c, "phone"),
    })).filter(c =>
      s(c.name).includes(q) || s(c.email).includes(q) || s(c.phone).includes(q)
    ).slice(0, 3).map(c => ({
      id: `c-${c.id}`,
      title: c.name || "Unnamed client",
      subtitle: [c.phone, c.email].filter(Boolean).join(" • ") || "—",
      type: "Client" as const, route: "/clients", icon: User
    }));

    // Search Leads (Limit 3)
    const matchedLeads = (leads as any[]).map(l => ({
      id: String(pick(l, "id", "lead_ref")),
      name: pick(l, "clientName", "client_name"),
      phone: pick(l, "phone"),
      stage: pick(l, "stage"),
    })).filter(l =>
      s(l.name).includes(q) || s(l.phone).includes(q) || s(l.stage).includes(q)
    ).slice(0, 3).map(l => ({
      id: `l-${l.id}`,
      title: l.name || "New inquiry",
      subtitle: [l.stage ? `Stage: ${l.stage}` : "", l.phone].filter(Boolean).join(" • "),
      type: "Lead" as const, route: "/leads", icon: Phone
    }));

    return [...matchedBookings, ...matchedClients, ...matchedLeads];
  }, [query, bookings, clients, leads]);

  return (
    <div ref={rootRef} className="relative hidden md:block z-50">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (query) setIsOpen(true);
        }}
        placeholder="Search CRM..."
        className="h-10 w-[280px] xl:w-[320px] pl-9 pr-10 bg-muted/50 border border-border/50 rounded-xl text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all shadow-sm"
      />
      
      {!query && (
         <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground bg-card border border-border/50 px-1.5 py-0.5 rounded font-mono pointer-events-none shadow-sm">
           ⌘F
         </kbd>
      )}

      {query && (
         <button 
           onClick={() => { setQuery(""); inputRef.current?.focus(); }}
           className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-0.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
         >
           <span className="text-[10px] leading-none font-bold block mb-0.5 opacity-80">x</span>
         </button>
      )}

      {/* Results Dropdown Box */}
      <AnimatePresence>
        {isOpen && query.trim() !== "" && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mb-0 mt-2 right-0 md:left-0 w-[400px] bg-card/95 backdrop-blur-2xl border border-border/50 shadow-2xl rounded-2xl overflow-hidden pb-1 z-50"
          >
             {/* Simulating fetch loader */}
             {isSimulatingLoad ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-[13px] font-medium animate-pulse">Searching pipeline...</span>
                </div>
             ) : results.length > 0 ? (
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {/* Map through types safely */}
                  {["Booking", "Client", "Lead"].map((categoryType) => {
                    const categoryItems = results.filter(r => r.type === categoryType);
                    if (categoryItems.length === 0) return null;
                    return (
                      <div key={categoryType}>
                         <div className="px-4 py-2 mt-2 sticky top-0 bg-card/95 backdrop-blur-md z-10 border-b border-border/30">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              {categoryType}s
                            </span>
                         </div>
                         <div className="px-2 py-1">
                           {categoryItems.map((item) => (
                              <button 
                                key={item.id}
                                onClick={() => {
                                  setIsOpen(false);
                                  setQuery("");
                                  router.push(item.route);
                                }}
                                className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group"
                              >
                                 <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 dark:text-orange-400 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                                   <item.icon className="h-4 w-4" />
                                 </div>
                                 <div className="overflow-hidden">
                                   <p className="text-[14px] font-semibold text-foreground truncate">{item.title}</p>
                                   <p className="text-[12px] text-muted-foreground truncate">{item.subtitle}</p>
                                 </div>
                              </button>
                           ))}
                         </div>
                      </div>
                    )
                  })}
                </div>
             ) : (
                <div className="py-8 px-6 text-center">
                   <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                     <Search className="h-4 w-4 text-muted-foreground opacity-50" />
                   </div>
                   <p className="text-[14px] font-semibold text-foreground mb-1">No results matching "{query}"</p>
                   <p className="text-[13px] text-muted-foreground">Try searching by client name, email, phone, or location venue.</p>
                </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
