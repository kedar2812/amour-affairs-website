// ============================================================
// Real analytics aggregations computed from the live API data
// (leads / bookings / payment stats). Replaces the old zeroed
// mock chart data so every chart reflects the actual database.
// ============================================================

export type Range = "Week" | "Month" | "Year" | "Max";

export const LEAD_STAGES = ["New Inquiry", "Contacted", "Consultation Scheduled", "Proposal Sent", "Won"] as const;
export const LEAD_SOURCES = ["Website", "Instagram", "WhatsApp", "Google", "Referral", "Other"] as const;
const SOURCE_COLORS: Record<string, string> = {
  Website: "var(--primary)", Instagram: "#ec4899", WhatsApp: "#10b981",
  Google: "#3b82f6", Referral: "#8b5cf6", Other: "#f59e0b",
};
const TYPE_PALETTE = ["var(--primary)", "#ec4899", "#3b82f6", "#a855f7", "#10b981", "#f59e0b"];

const RANGE_DAYS: Record<Range, number> = { Week: 7, Month: 31, Year: 366, Max: 100000 };

function ts(iso?: string): number {
  if (!iso) return 0;
  const t = new Date(String(iso).replace(" ", "T")).getTime();
  return Number.isNaN(t) ? 0 : t;
}
export function withinRange(iso: string | undefined, range: Range): boolean {
  if (range === "Max") return true;
  const t = ts(iso);
  if (!t) return false;
  return Date.now() - t <= RANGE_DAYS[range] * 86400000;
}

type Lead = { stage?: string; source?: string; created_at?: string };
type Booking = { event_type?: string; eventType?: string; created_at?: string; date_start?: string };

const FUNNEL_COLORS = [
  "var(--primary)", "hsl(var(--primary) / 0.8)", "hsl(var(--primary) / 0.65)",
  "hsl(var(--primary) / 0.5)", "hsl(var(--primary) / 0.35)",
];

// Pipeline distribution — how many leads currently sit at each stage.
export function buildFunnel(leads: Lead[], range: Range) {
  const f = leads.filter((l) => withinRange(l.created_at, range));
  return LEAD_STAGES.map((stage, i) => ({
    stage, count: f.filter((l) => l.stage === stage).length, color: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
  }));
}

// Lead sources as a % share of leads in range.
export function buildSources(leads: Lead[], range: Range) {
  const f = leads.filter((l) => withinRange(l.created_at, range));
  const total = f.length || 1;
  return LEAD_SOURCES
    .map((name) => ({ name, count: f.filter((l) => (l.source || "Other") === name).length }))
    .filter((s) => s.count > 0)
    .map((s) => ({ name: s.name, value: Math.round((s.count / total) * 100), color: SOURCE_COLORS[s.name] || "#f59e0b" }));
}

// Booking types by count of bookings in range.
export function buildBookingTypes(bookings: Booking[], range: Range) {
  const f = bookings.filter((b) => withinRange(b.created_at || b.date_start, range));
  const counts = new Map<string, number>();
  for (const b of f) {
    const t = b.event_type || b.eventType || "Other";
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  return [...counts.entries()].map(([name, value], i) => ({ name, value, color: TYPE_PALETTE[i % TYPE_PALETTE.length] }));
}

// Monthly revenue as {name, realised, projected} bars for the dashboard chart.
export function buildRevenueBars(monthly: Array<{ month: string; total: number | string }> | undefined) {
  const rows = Array.isArray(monthly) ? monthly : [];
  return rows.map((r) => {
    const d = new Date((r.month || "") + "-01T00:00:00");
    const name = Number.isNaN(d.getTime()) ? String(r.month) : d.toLocaleDateString("en-IN", { month: "short" });
    return { name, realised: Number(r.total) || 0, projected: 0 };
  });
}

// Monthly revenue series from payment stats ({month:'YYYY-MM', total}).
export function buildRevenueSeries(monthly: Array<{ month: string; total: number | string }> | undefined) {
  const rows = Array.isArray(monthly) ? monthly : [];
  return rows.map((r, i) => {
    const d = new Date((r.month || "") + "-01T00:00:00");
    const label = Number.isNaN(d.getTime())
      ? String(r.month)
      : d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
    return { time: label, thisPeriod: Number(r.total) || 0, lastPeriod: i > 0 ? Number(rows[i - 1].total) || 0 : 0 };
  });
}
