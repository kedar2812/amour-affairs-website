"use client";

import React, { useState } from 'react';
import { Download, ChevronDown, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, LineChart as RechartsLineChart, Line, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { analyticsYearCompData, analyticsBookingTypesData, trafficBreakdownData, funnelDataConfig, TimeRange } from '@/data/mockChartData';


const formatINR = (tickItem: number) => {
  if (tickItem >= 100000) return `₹${tickItem / 100000}L`;
  return `₹${tickItem / 1000}K`;
};

function AnalyticsDropdown({ active, options, onChange }: { active: string, options: string[], onChange: (val: any) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative z-10 w-fit">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between min-w-[100px] gap-1.5 text-[12px] text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/60 border border-border/40 px-2.5 py-1.5 rounded-md font-medium transition-colors"
       >
        {active}
        <ChevronDown className="h-3 w-3" />
      </button>
      {isOpen && (
         <div className="absolute top-full mt-1 right-0 w-32 bg-card border border-border/50 shadow-lg rounded-lg py-1 z-50">
            {options.map((t) => (
              <button
                key={t}
                onClick={() => { onChange(t); setIsOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-muted font-medium text-foreground transition-colors"
              >
                {t}
              </button>
            ))}
         </div>
      )}
    </div>
  );
}

function RevenueCompChart() {
  const [range, setRange] = useState<TimeRange>("Year");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const data = analyticsYearCompData[range];
  return (
    <div className="dash-card p-6 xl:col-span-2 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Revenue Trends</h2>
          <p className="text-[13px] text-muted-foreground">Actual vs previous period.</p>
        </div>
        <div className="flex items-center gap-3">
          <AnalyticsDropdown active={range} options={["Week", "Month", "Year", "Max"]} onChange={setRange} />
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
      <div className="h-[300px] w-full flex-1">
        <ResponsiveContainer>
          {chartType === "bar" ? (
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={formatINR} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <Tooltip 
                cursor={{ fill: 'var(--border)', opacity: 0.2 }}
                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <Bar dataKey="thisPeriod" name="Current Period" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={32} animationDuration={800} />
              <Line type="monotone" dataKey="lastPeriod" name="Last Period" stroke="#8b93a5" strokeWidth={3} strokeDasharray="5 5" activeDot={{ r: 6 }} animationDuration={800} />
            </ComposedChart>
          ) : (
            <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={formatINR} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <Tooltip 
                cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4" }}
                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
              <Line type="monotone" dataKey="thisPeriod" name="Current Period" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} activeDot={{ r: 6 }} animationDuration={800} />
              <Line type="monotone" dataKey="lastPeriod" name="Last Period" stroke="var(--muted-foreground)" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: "var(--background)", stroke: "var(--muted-foreground)" }} activeDot={{ r: 6 }} animationDuration={800} />
            </RechartsLineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BookingTypesPie() {
  const [range, setRange] = useState<TimeRange>("Year");
  const data = analyticsBookingTypesData[range];
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="dash-card p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Booking Types</h2>
          <p className="text-[13px] text-muted-foreground">Breakdown of services.</p>
        </div>
        <AnalyticsDropdown active={range} options={["Week", "Month", "Year", "Max"]} onChange={setRange} />
      </div>
      <div className="h-[250px] w-full relative flex-1">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none" animationDuration={800}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
              itemStyle={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--foreground)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <AnimatePresence mode="popLayout">
            <motion.span key={total} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="text-2xl font-bold text-foreground">{total}</motion.span>
          </AnimatePresence>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Bookings</span>
        </div>
      </div>
    </div>
  );
}

function ConversionFunnelChart() {
  const [range, setRange] = useState<TimeRange>("Month");
  const data = funnelDataConfig[range];
  return (
    <div className="dash-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pipeline Drop-off</h2>
        </div>
        <AnalyticsDropdown active={range} options={["Week", "Month", "Year", "Max"]} onChange={setRange} />
      </div>
      <div className="h-[220px] w-full">
         <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
            <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--foreground)', fontWeight: 600 }} />
            <XAxis type="number" hide />
            <Tooltip 
              cursor={{ fill: 'var(--border)', opacity: 0.2 }}
              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="count" fill="var(--primary)" barSize={24} radius={[0, 4, 4, 0]} animationDuration={800}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(40, 45%, ${60 - index * 10}%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LeadSourcesChart() {
  const [range, setRange] = useState<TimeRange>("Month");
  const data = trafficBreakdownData[range];
  return (
    <div className="dash-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Lead Sources</h2>
        </div>
        <AnalyticsDropdown active={range} options={["Week", "Month", "Year", "Max"]} onChange={setRange} />
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
            <XAxis type="number" hide />
            <Tooltip 
              cursor={{ fill: 'var(--border)', opacity: 0.2 }}
              contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
            />
            <Bar dataKey="value" fill="#3b82f6" barSize={16} radius={[0, 4, 4, 0]} label={{ position: 'right', fill: 'var(--foreground)', fontSize: 13, fontWeight: 'bold', formatter: (val: any) => `${val}%` }} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full h-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Insights to grow your studio.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 px-4 rounded-xl border-border/50 bg-card/10">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Total Revenue", val: "₹42.6L", up: true },
          { label: "Total Bookings", val: "142", up: true },
          { label: "Avg Booking Val", val: "₹30K", up: true },
          { label: "Conversion Rate", val: "34.5%", up: false },
          { label: "Repeat Client", val: "75%", up: true },
          { label: "Avg Rating", val: "4.8", up: true },
        ].map(kpi => (
          <div key={kpi.label} className="dash-card p-4 flex flex-col justify-center items-center text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block w-full">{kpi.label}</span>
            <span className="text-xl font-bold text-foreground">{kpi.val}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <RevenueCompChart />
        <BookingTypesPie />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
        <ConversionFunnelChart />
        <LeadSourcesChart />
      </div>
    </div>
  );
}
