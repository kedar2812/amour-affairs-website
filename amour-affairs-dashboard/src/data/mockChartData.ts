// src/data/mockChartData.ts
// Robust mock data for dynamic data visualization testing across different time scales

export type TimeRange = "Week" | "Month" | "Year" | "Max";

export const revenueForecastData = {
  Week: [
    { name: "Mon", realised: 0.4, projected: 0.2 },
    { name: "Tue", realised: 0.8, projected: 0.1 },
    { name: "Wed", realised: 1.2, projected: 0.4 },
    { name: "Thu", realised: 0.9, projected: 0.5 },
    { name: "Fri", realised: 1.5, projected: 0.8 },
    { name: "Sat", realised: 2.1, projected: 1.0 },
    { name: "Sun", realised: 1.8, projected: 0.9 },
  ],
  Month: [
    { name: "Week 1", realised: 4.8, projected: 1.2 },
    { name: "Week 2", realised: 5.4, projected: 0.8 },
    { name: "Week 3", realised: 6.2, projected: 1.6 },
    { name: "Week 4", realised: 7.1, projected: 0.9 },
  ],
  Year: [
    { name: "Jan", realised: 2.4, projected: 0.6 },
    { name: "Feb", realised: 2.8, projected: 0.4 },
    { name: "Mar", realised: 3.2, projected: 0.6 },
    { name: "Apr", realised: 4.1, projected: 0.3 },
    { name: "May", realised: 4.5, projected: 0.2 },
    { name: "Jun", realised: 3.8, projected: 0.8 },
    { name: "Jul", realised: 2.9, projected: 1.2 },
    { name: "Aug", realised: 3.4, projected: 1.4 },
    { name: "Sep", realised: 4.0, projected: 1.6 },
    { name: "Oct", realised: 1.2, projected: 4.2 },
    { name: "Nov", realised: 0.8, projected: 4.8 },
    { name: "Dec", realised: 0.4, projected: 5.6 },
  ],
  Max: [
    { name: "Jan 2025", realised: 2.4, projected: 0.6 },
    { name: "Apr 2025", realised: 11.4, projected: 1.3 },
    { name: "Jul 2025", realised: 10.1, projected: 3.4 },
    { name: "Oct 2025", realised: 6.0, projected: 14.6 },
    { name: "Jan 2026", realised: 10.4, projected: 1.6 },
    { name: "Apr 2026", realised: 14.1, projected: 4.3 },
  ]
};

export const revenueKPIs = {
  Week: { total: "₹82,400", trend: "+5.1%", avg: "₹11.7K", increaseText: "since last week" },
  Month: { total: "₹4,21,500", trend: "+12.0%", avg: "₹1L", increaseText: "since last month" },
  Year: { total: "₹52.4L", trend: "+24.0%", avg: "₹4.3L", increaseText: "since last year" },
  Max: { total: "₹88.5L", trend: "+45.0%", avg: "₹3.8L", increaseText: "since inception" },
};

export const trafficBreakdownData = {
  Week: [
    { name: "Instagram", value: 42, color: "var(--primary)" },
    { name: "WhatsApp", value: 28, color: "#1A1A2E" },
    { name: "Google", value: 12, color: "#10B981" },
    { name: "Referral", value: 10, color: "#8B5CF6" },
    { name: "Website", value: 8, color: "#F59E0B" },
  ],
  Month: [
    { name: "Instagram", value: 38, color: "var(--primary)" },
    { name: "WhatsApp", value: 26, color: "#1A1A2E" },
    { name: "Google", value: 14, color: "#10B981" },
    { name: "Referral", value: 12, color: "#8B5CF6" },
    { name: "Website", value: 10, color: "#F59E0B" },
  ],
  Year: [
    { name: "Instagram", value: 45, color: "var(--primary)" },
    { name: "WhatsApp", value: 20, color: "#1A1A2E" },
    { name: "Google", value: 18, color: "#10B981" },
    { name: "Referral", value: 10, color: "#8B5CF6" },
    { name: "Website", value: 7, color: "#F59E0B" },
  ],
  Max: [
    { name: "Instagram", value: 50, color: "var(--primary)" },
    { name: "WhatsApp", value: 15, color: "#1A1A2E" },
    { name: "Google", value: 20, color: "#10B981" },
    { name: "Referral", value: 10, color: "#8B5CF6" },
    { name: "Website", value: 5, color: "#F59E0B" },
  ]
};

export const trafficKPIs = {
  Week: { count: 215, trend: "+8.2%" },
  Month: { count: 842, trend: "+12.5%" },
  Year: { count: 12450, trend: "+32.5%" },
  Max: { count: 28420, trend: "+60.0%" },
};

export const funnelDataConfig = {
  Week: [
    { stage: "Inquiry", count: 65, color: "var(--primary)" },
    { stage: "Consultation", count: 42, color: "hsl(var(--primary) / 0.8)" },
    { stage: "Proposal", count: 28, color: "hsl(var(--primary) / 0.65)" },
    { stage: "Booked", count: 15, color: "hsl(var(--primary) / 0.5)" },
    { stage: "Delivered", count: 8, color: "hsl(var(--primary) / 0.35)" },
  ],
  Month: [
    { stage: "Inquiry", count: 245, color: "var(--primary)" },
    { stage: "Consultation", count: 180, color: "hsl(var(--primary) / 0.8)" },
    { stage: "Proposal", count: 120, color: "hsl(var(--primary) / 0.65)" },
    { stage: "Booked", count: 85, color: "hsl(var(--primary) / 0.5)" },
    { stage: "Completed", count: 60, color: "hsl(var(--primary) / 0.35)" },
    { stage: "Delivered", count: 45, color: "hsl(var(--primary) / 0.2)" },
  ],
  Year: [
    { stage: "Inquiry", count: 3200, color: "var(--primary)" },
    { stage: "Consultation", count: 2400, color: "hsl(var(--primary) / 0.8)" },
    { stage: "Proposal", count: 1800, color: "hsl(var(--primary) / 0.65)" },
    { stage: "Booked", count: 1200, color: "hsl(var(--primary) / 0.5)" },
    { stage: "Delivered", count: 850, color: "hsl(var(--primary) / 0.35)" },
  ],
  Max: [
    { stage: "Inquiry", count: 6800, color: "var(--primary)" },
    { stage: "Consultation", count: 4500, color: "hsl(var(--primary) / 0.8)" },
    { stage: "Proposal", count: 3200, color: "hsl(var(--primary) / 0.65)" },
    { stage: "Booked", count: 2100, color: "hsl(var(--primary) / 0.5)" },
    { stage: "Delivered", count: 1650, color: "hsl(var(--primary) / 0.35)" },
  ]
};

export const packagePerformanceData = {
  Week: [
    { title: "Wedding Premium", price: "₹1.5L", bookings: 8, revShare: 50, trend: "up", color: "var(--primary)" },
    { title: "Pre-Wedding Deluxe", price: "₹65K", bookings: 5, revShare: 18, trend: "up", color: "#8B5CF6" },
    { title: "Corporate Standard", price: "₹35K", bookings: 3, revShare: 12, trend: "down", color: "#3B82F6" },
  ],
  Month: [
    { title: "Wedding Premium", price: "₹1.5L", bookings: 42, revShare: 45, trend: "up", color: "var(--primary)" },
    { title: "Pre-Wedding Deluxe", price: "₹65K", bookings: 38, revShare: 20, trend: "up", color: "#8B5CF6" },
    { title: "Corporate Standard", price: "₹35K", bookings: 24, revShare: 15, trend: "down", color: "#3B82F6" },
    { title: "Wedding Basic", price: "₹95K", bookings: 18, revShare: 12, trend: "up", color: "#F59E0B" },
    { title: "Portrait Session", price: "₹15K", bookings: 15, revShare: 8, trend: "up", color: "#10B981" },
  ],
  Year: [
    { title: "Wedding Premium", price: "₹1.5L", bookings: 450, revShare: 48, trend: "up", color: "var(--primary)" },
    { title: "Pre-Wedding Deluxe", price: "₹65K", bookings: 380, revShare: 22, trend: "up", color: "#8B5CF6" },
    { title: "Corporate Standard", price: "₹35K", bookings: 240, revShare: 18, trend: "up", color: "#3B82F6" },
    { title: "Wedding Basic", price: "₹95K", bookings: 180, revShare: 8, trend: "down", color: "#F59E0B" },
    { title: "Portrait", price: "₹15K", bookings: 210, revShare: 4, trend: "up", color: "#10B981" },
  ],
  Max: [
    { title: "Wedding Premium", price: "₹1.5L", bookings: 850, revShare: 52, trend: "up", color: "var(--primary)" },
    { title: "Pre-Wedding Deluxe", price: "₹65K", bookings: 780, revShare: 24, trend: "up", color: "#8B5CF6" },
    { title: "Corporate Standard", price: "₹35K", bookings: 440, revShare: 14, trend: "up", color: "#3B82F6" },
    { title: "Wedding Basic", price: "₹95K", bookings: 380, revShare: 6, trend: "down", color: "#F59E0B" },
    { title: "Portrait", price: "₹15K", bookings: 410, revShare: 4, trend: "up", color: "#10B981" },
  ]
};

// Analytics Specific Multi-Dimensional Data
export const analyticsYearCompData = {
  "Week": [
    { time: 'Mon', thisPeriod: 12000, lastPeriod: 9000 },
    { time: 'Tue', thisPeriod: 15000, lastPeriod: 11000 },
    { time: 'Wed', thisPeriod: 13000, lastPeriod: 14000 },
    { time: 'Thu', thisPeriod: 16000, lastPeriod: 12000 },
    { time: 'Fri', thisPeriod: 22000, lastPeriod: 18000 },
    { time: 'Sat', thisPeriod: 35000, lastPeriod: 28000 },
    { time: 'Sun', thisPeriod: 32000, lastPeriod: 25000 },
  ],
  "Month": [
    { time: 'Week 1', thisPeriod: 120000, lastPeriod: 90000 },
    { time: 'Week 2', thisPeriod: 150000, lastPeriod: 110000 },
    { time: 'Week 3', thisPeriod: 130000, lastPeriod: 140000 },
    { time: 'Week 4', thisPeriod: 160000, lastPeriod: 120000 },
  ],
  "Year": [
    { time: 'Q1', thisPeriod: 1410000, lastPeriod: 1230000 },
    { time: 'Q2', thisPeriod: 1680000, lastPeriod: 1350000 },
    { time: 'Q3', thisPeriod: 1850000, lastPeriod: 1600000 },
    { time: 'Q4', thisPeriod: 2100000, lastPeriod: 1950000 },
  ],
  "Max": [
    { time: '2023', thisPeriod: 3410000, lastPeriod: 0 },
    { time: '2024', thisPeriod: 5680000, lastPeriod: 3410000 },
    { time: '2025', thisPeriod: 7850000, lastPeriod: 5680000 },
    { time: '2026', thisPeriod: 9100000, lastPeriod: 7850000 },
  ]
};

export const analyticsBookingTypesData = {
  "Week": [
    { name: 'Wedding', value: 45, color: 'var(--primary)' },
    { name: 'Pre-Wedding', value: 25, color: '#ec4899' },
    { name: 'Corporate', value: 10, color: '#3b82f6' },
  ],
  "Month": [
    { name: 'Wedding', value: 50, color: 'var(--primary)' },
    { name: 'Pre-Wedding', value: 20, color: '#ec4899' },
    { name: 'Corporate', value: 15, color: '#3b82f6' },
    { name: 'Portrait', value: 10, color: '#a855f7' },
    { name: 'Maternity', value: 5, color: '#10b981' },
  ],
  "Year": [
    { name: 'Wedding', value: 55, color: 'var(--primary)' },
    { name: 'Pre-Wedding', value: 18, color: '#ec4899' },
    { name: 'Corporate', value: 12, color: '#3b82f6' },
    { name: 'Portrait', value: 10, color: '#a855f7' },
    { name: 'Maternity', value: 5, color: '#10b981' },
  ],
  "Max": [
    { name: 'Wedding', value: 65, color: 'var(--primary)' },
    { name: 'Pre-Wedding', value: 15, color: '#ec4899' },
    { name: 'Corporate', value: 10, color: '#3b82f6' },
    { name: 'Portrait', value: 6, color: '#a855f7' },
    { name: 'Maternity', value: 4, color: '#10b981' },
  ]
};
