"use client";
import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { Filter } from "lucide-react";

/*
 * Donezo "Team Collaboration" section adapted for photographers.
 * Avatar with status dot, role, current assignment, status badge.
 */
const statusStyles: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  "On Shoot": { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-500", label: "On Shoot" },
  "Editing": { dot: "bg-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-500", label: "Editing" },
  "Available": { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-500", label: "Available" },
  "On Leave": { dot: "bg-muted-foreground", bg: "bg-muted", text: "text-muted-foreground", label: "On Leave" },
};

const team = [
  { name: "Kedar Gurav", role: "Lead Photographer", status: "On Shoot", assignment: "Ritz-Carlton Wedding", avatar: "https://i.pravatar.cc/150?u=kedar" },
  { name: "Rajat Kulkarni", role: "Photographer", status: "Available", assignment: "", avatar: "https://i.pravatar.cc/150?u=rajat" },
  { name: "Nikhil Thapar", role: "Photographer", status: "Editing", assignment: "Aman Pre-Wedding Album", avatar: "https://i.pravatar.cc/150?u=nikhil" },
  { name: "Sunil Mehta", role: "Videographer", status: "On Leave", assignment: "", avatar: "https://i.pravatar.cc/150?u=sunil" },
];

export function TeamStatus() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.32 }}
      className="h-full"
    >
      <div className="dash-card h-full flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4">
          <h3 className="text-[18px] font-bold text-foreground">Team Status</h3>
          <button className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
        </div>

        <div className="flex-1 px-6 pb-5 space-y-4">
          {team.map((member, i) => {
            const sty = statusStyles[member.status];
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-full overflow-hidden ring-2 ring-card shadow-sm">
                    <img src={member.avatar} alt={member.name} className="h-full w-full object-cover" />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ${sty.dot} ring-2 ring-card`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[14px] font-semibold text-foreground truncate">{member.name}</h5>
                  <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
                    {member.assignment ? <>Working on <span className="font-medium text-foreground">{member.assignment}</span></> : member.role}
                  </p>
                </div>
                {/* Donezo-style status badge */}
                <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-md ${sty.bg} ${sty.text}`}>
                  {sty.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
