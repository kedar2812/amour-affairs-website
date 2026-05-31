"use client";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useState } from "react";
import { TrendingUp, ChevronDown } from "lucide-react";
import { trafficBreakdownData, trafficKPIs, TimeRange } from "@/data/mockChartData";

/*
 * Sparklink "Traffic Breakdown" donut chart adapted for lead sources.
 * Interactive hover on legend highlights the segment.
 */

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="bg-card rounded-lg px-3 py-2 shadow-lg border border-border/50 text-[14px]">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ background: item.payload.color }} />
        <span className="font-medium text-foreground">{item.payload.name}</span>
        <span className="font-bold text-foreground">{item.value}%</span>
      </div>
    </div>
  );
}

export function TrafficBreakdown() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeToggle, setActiveToggle] = useState<TimeRange>("Month");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentData = trafficBreakdownData[activeToggle];
  const currentKPI = trafficKPIs[activeToggle];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.24 }}
      className="h-full relative"
    >
      <div className="dash-card h-full flex flex-col">
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-bold text-foreground">Lead Sources</h3>
            <div className="relative">
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-2 py-1 rounded-md font-medium transition-colors"
               >
                This {activeToggle}
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
                        This {t}
                      </button>
                    ))}
                 </div>
              )}
            </div>
          </div>
          <AnimatePresence mode="popLayout">
            <motion.div 
               key={activeToggle}
               initial={{ opacity: 0, y: -4 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 4 }}
               transition={{ duration: 0.2 }}
               className="flex items-baseline gap-2 mt-2"
            >
              <span className="text-2xl font-bold text-foreground">{currentKPI.count}</span>
              <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="h-3 w-3" /> {currentKPI.trend}
              </span>
              <span className="text-[12px] text-muted-foreground">vs previous</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex-1 flex items-center px-2">
          {/* Donut chart */}
          <div className="w-1/2 min-h-[170px]">
             <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={currentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={3}
                  onMouseLeave={() => setHoveredIndex(null)}
                  animationDuration={800}
                >
                  {currentData.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.3}
                      onMouseEnter={() => setHoveredIndex(index)}
                      style={{ transition: "opacity 0.2s ease", cursor: "pointer" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend — Sparklink-style vertical */}
          <div className="w-1/2 pr-4 space-y-3">
             <AnimatePresence mode="wait">
               <motion.div
                 key={activeToggle}
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 transition={{ duration: 0.2 }}
                 className="space-y-3"
               >
                {currentData.map((item: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between cursor-pointer transition-opacity duration-200 ${
                      hoveredIndex === null || hoveredIndex === i ? "opacity-100" : "opacity-30"
                    }`}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-[13px] font-medium text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-[13px] font-bold text-foreground">{item.value}%</span>
                  </div>
                ))}
              </motion.div>
             </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
