"use client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, CalendarCheck, IndianRupee, BookOpen, Eye, ArrowUpRight } from "lucide-react";

/*
 * Sparklink-style KPI cards: colored icon box on the left, 
 * large value, change indicator badge, and a subtle trend arrow button.
 */
const metrics = [
  {
    title: "Total Bookings",
    value: "142",
    change: "+12%",
    changeLabel: "Increased from last month",
    changeType: "positive" as const,
    icon: BookOpen,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    borderColor: "border-l-primary",
  },
  {
    title: "Gross Revenue",
    value: "₹4.2L",
    change: "+8.3%",
    changeLabel: "Increased from last month",
    changeType: "positive" as const,
    icon: IndianRupee,
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-500",
    borderColor: "border-l-emerald-500",
  },
  {
    title: "Active Inquiries",
    value: "28",
    change: "+4",
    changeLabel: "Increased from last month",
    changeType: "positive" as const,
    icon: Eye,
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-500",
    borderColor: "border-l-blue-500",
  },
  {
    title: "Shoots This Week",
    value: "6",
    change: "2",
    changeLabel: "On Discuss",
    changeType: "neutral" as const,
    icon: CalendarCheck,
    iconBg: "bg-amber-50 dark:bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-500",
    borderColor: "border-l-amber-500",
  },
];

export function KPICards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className={`dash-card p-5 flex items-start gap-4 border-l-4 ${metric.borderColor}`}>
            {/* Colored icon box — Sparklink-style */}
            <div className={`h-12 w-12 rounded-xl ${metric.iconBg} flex items-center justify-center shrink-0`}>
              <metric.icon className={`h-6 w-6 ${metric.iconColor}`} strokeWidth={1.7} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <p className="text-[14px] font-bold text-foreground">{metric.title}</p>
                {/* Trend arrow button — Sparklink corner arrow */}
                <button className="h-7 w-7 rounded-lg border border-border/50 flex items-center justify-center hover:bg-muted/50 transition-colors -mt-0.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
              <h3 className="text-2xl font-bold text-foreground mt-1 tracking-tight">{metric.value}</h3>
              <div className="flex items-center gap-1.5 mt-2">
                {metric.changeType === "positive" ? (
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                ) : (
                  <span className="text-[14px] text-muted-foreground">•</span>
                )}
                <span className={`text-[12px] font-medium ${
                  metric.changeType === "positive" ? "text-emerald-600" : "text-muted-foreground"
                }`}>
                  {metric.changeLabel}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
