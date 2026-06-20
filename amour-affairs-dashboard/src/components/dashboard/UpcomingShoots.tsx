"use client";
import { motion } from "framer-motion";
import { MapPin, Clock, ChevronRight, CalendarDays } from "lucide-react";

type Shoot = { id: number; day: string; weekday: string; title: string; category: string; time: string; venue: string; photographer: { name: string; avatar: string } };

/*
 * Donezo Calendar-style upcoming shoots list with 
 * date block, category badges, photographer avatars.
 */
const categoryStyles: Record<string, { bg: string; text: string }> = {
  Wedding: { bg: "bg-primary/10", text: "text-primary" },
  "Pre-Wedding": { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  Corporate: { bg: "bg-blue-50 dark:bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  Portrait: { bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
};

// Not yet wired to live bookings — intentionally empty until real data flows in.
const shoots: Shoot[] = [];

export function UpcomingShoots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="h-full"
    >
      <div className="dash-card h-full flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h3 className="text-[18px] font-bold text-foreground">Upcoming Shoots</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">Next 7 days</p>
          </div>
          <button className="text-[13px] font-semibold text-primary flex items-center gap-0.5 hover:underline">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto">
          {shoots.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-10 gap-2">
              <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">No upcoming shoots yet</p>
            </div>
          )}
          {shoots.map((shoot, i) => {
            const style = categoryStyles[shoot.category];
            return (
              <motion.div
                key={shoot.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.25 + i * 0.06 }}
                className="flex gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {/* Date block */}
                <div className="w-11 shrink-0 flex flex-col items-center justify-center py-1.5 bg-muted rounded-lg">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{shoot.weekday}</span>
                  <span className="text-lg font-bold text-foreground leading-tight">{shoot.day}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-[14px] font-semibold text-foreground truncate">{shoot.title}</h4>
                    <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md ${style.bg} ${style.text}`}>
                      {shoot.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{shoot.time}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[12px] text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{shoot.venue}</span>
                  </div>
                </div>

                <div className="shrink-0 self-center">
                  <div className="h-7 w-7 rounded-full overflow-hidden ring-2 ring-card shadow-sm">
                    <img src={shoot.photographer.avatar} alt={shoot.photographer.name} className="h-full w-full object-cover" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
