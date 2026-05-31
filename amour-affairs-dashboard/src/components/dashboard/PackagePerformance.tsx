"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { packagePerformanceData, TimeRange } from "@/data/mockChartData";

/*
 * Sparklink "Best Selling Product" table adapted for photography packages.
 * Clean list with progress bars.
 */

export function PackagePerformance() {
  const [activeToggle, setActiveToggle] = useState<TimeRange>("Month");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentData = packagePerformanceData[activeToggle];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.28 }}
      className="h-full relative"
    >
      <div className="dash-card h-full flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h3 className="text-[18px] font-bold text-foreground">Package Performance</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">Top packages by bookings</p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-md font-medium transition-colors"
            >
              {activeToggle}
              <ChevronDown className="h-3 w-3" />
            </button>
            {isDropdownOpen && (
               <div className="absolute top-full mt-1 right-0 w-24 bg-card border border-border/50 shadow-lg rounded-lg py-1 z-50">
                  {(["Week", "Month", "Year", "Max"] as TimeRange[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setActiveToggle(t); setIsDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted font-medium text-foreground transition-colors"
                    >
                      {t}
                    </button>
                  ))}
               </div>
            )}
          </div>
        </div>

        <div className="flex-1 px-6 pb-5 space-y-4">
          <AnimatePresence mode="popLayout">
            {currentData.map((pkg, i) => (
              <motion.div 
                key={pkg.title}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-[12px] font-bold text-white shrink-0"
                  style={{ background: pkg.color }}
                >
                  {pkg.title.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-[13px] font-semibold text-foreground truncate">{pkg.title}</h5>
                    <span className="text-[13px] font-bold text-foreground ml-2">{pkg.price}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pkg.revShare}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full rounded-full"
                        style={{ background: pkg.color }}
                      />
                    </div>
                    <AnimatePresence mode="popLayout">
                       <motion.span 
                         key={pkg.revShare}
                         initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                         className="text-[11px] text-muted-foreground font-medium w-7 text-right"
                       >
                         {pkg.revShare}%
                       </motion.span>
                    </AnimatePresence>
                    <AnimatePresence mode="popLayout">
                      <motion.span 
                        key={pkg.bookings}
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                        className="text-[11px] text-muted-foreground w-4 text-center"
                      >
                       {pkg.bookings}
                      </motion.span>
                    </AnimatePresence>
                    {pkg.trend === "up" ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400 shrink-0" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
