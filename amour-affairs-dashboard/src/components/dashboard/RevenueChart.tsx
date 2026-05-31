"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bar, BarChart, LineChart, Line, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp, BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { revenueForecastData, revenueKPIs, TimeRange } from "@/data/mockChartData";

/*
 * Sparklink-style Revenue Forecast:
 * - Large revenue header with trend badge
 * - Time toggle + Chart type toggle
 * - Clean visual charts
 * - Average line reference
 */

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-card rounded-lg px-3.5 py-2.5 shadow-lg border border-border/50 text-[14px]">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-sm" style={{ background: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.dataKey}:</span>
          <span className="font-semibold text-foreground">
            {entry.value < 10 ? `₹${entry.value.toFixed(1)}L` : `₹${entry.value.toFixed(1)}K`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart() {
  const [activeToggle, setActiveToggle] = useState<TimeRange>("Month");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  
  const currentData = revenueForecastData[activeToggle];
  const currentKPIs = revenueKPIs[activeToggle];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      className="h-full"
    >
      <div className="dash-card h-full flex flex-col">
        {/* Header — Sparklink Revenue Forecast style */}
        <div className="flex items-start justify-between p-6 pb-3">
          <div className="min-w-[200px]">
            <h3 className="text-[18px] font-bold text-foreground">Revenue Forecast</h3>
            <AnimatePresence mode="popLayout">
              <motion.div 
                key={activeToggle}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="text-3xl font-bold text-foreground tracking-tight">{currentKPIs.total}</span>
                  <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-3 w-3" /> {currentKPIs.trend}
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-1">{currentKPIs.increaseText}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          
          <div className="flex flex-col items-end gap-3 shrink-0">
            {/* Toggle tabs */}
            <div className="flex bg-muted p-0.5 rounded-lg">
              {(["Week", "Month", "Year", "Max"] as TimeRange[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveToggle(t)}
                  className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-all duration-200 ${
                    activeToggle === t
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-muted/50 border border-border/50 rounded-lg p-0.5">
              <button 
                 onClick={() => setChartType("bar")}
                 className={`p-1.5 rounded-md transition-colors ${chartType === "bar" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                 title="Bar Chart"
              >
                  <BarChart3 className="h-4 w-4" />
              </button>
              <button 
                 onClick={() => setChartType("line")}
                 className={`p-1.5 rounded-md transition-colors ${chartType === "line" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                 title="Line Chart"
              >
                  <LineChartIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 px-4 pb-3 min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={currentData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={3} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }} tickFormatter={(val) => val < 10 ? `${val}L` : `${val}K`} dx={-4} domain={[0, 'dataMax + 0.5']} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.8, radius: 4 }} />
                <Bar dataKey="realised" name="Realised" fill="var(--primary)" radius={[4, 4, 0, 0]} animationDuration={800} />
                <Bar dataKey="projected" name="Projected" fill="var(--muted-foreground)" fillOpacity={0.25} radius={[4, 4, 0, 0]} animationDuration={800} />
              </BarChart>
            ) : (
              <LineChart data={currentData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF", fontWeight: 500 }} tickFormatter={(val) => val < 10 ? `${val}L` : `${val}K`} dx={-4} domain={[0, 'dataMax + 0.5']} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Line type="monotone" dataKey="realised" name="Realised" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} activeDot={{ r: 6 }} animationDuration={800} />
                <Line type="monotone" dataKey="projected" name="Projected" stroke="var(--muted-foreground)" strokeWidth={3} strokeDasharray="5 5" fillOpacity={0.25} dot={{ r: 4, fill: "var(--background)", stroke: "var(--muted-foreground)" }} activeDot={{ r: 6 }} animationDuration={800} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Legend strip */}
        <div className="border-t border-border/50 px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="text-[12px] text-muted-foreground font-medium">Realised</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />
            <span className="text-[12px] text-muted-foreground font-medium">Projected</span>
          </div>
          <div className="ml-auto text-[12px] text-muted-foreground">
            Avg: <span className="font-semibold text-foreground">{currentKPIs.avg}</span> / {activeToggle.toLowerCase()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
