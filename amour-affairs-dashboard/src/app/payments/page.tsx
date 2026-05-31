"use client";

import React, { useState } from 'react';
import { Search, Plus, Download, MoreHorizontal, DownloadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useInvoices, useTransactions } from '@/lib/useData';
import { Invoice, Transaction } from '@/data/mockData';

type TabView = "Invoices" | "Transactions" | "Advance Tracker";

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<TabView>("Invoices");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: invoices } = useInvoices();
  const { data: transactions } = useTransactions();

  const filteredInvoices = invoices.filter(inv => 
    inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    inv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTransactions = transactions.filter(tx => 
    tx.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    tx.bookingId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Partially Paid': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Pending': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Overdue': return 'bg-red-500/10 text-red-500 border-red-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Track invoices, dues, and revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search payments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-[240px] pl-9 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-xl border-border/50 bg-card/10">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground border-none shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {[
          { label: "Total Revenue (This Month)", val: "₹8,40,000" },
          { label: "Pending Dues", val: "₹1,35,000", alert: false },
          { label: "Overdue", val: "₹45,000", alert: true },
          { label: "Advance Collected", val: "₹3,20,000" }
        ].map(stat => (
          <div key={stat.label} className="dash-card p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
            <span className={`text-xl font-bold ${stat.alert ? 'text-red-500' : 'text-foreground'}`}>{stat.val}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card/50 border border-border/50 p-1 rounded-xl w-max shrink-0">
        {(["Invoices", "Transactions", "Advance Tracker"] as TabView[]).map(tab => (
           <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === tab ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="dash-card flex-1 min-h-[400px]">
        {activeTab === "Invoices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-[12px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 font-semibold">Invoice #</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Booking Ref</th>
                  <th className="px-6 py-4 font-semibold">Due Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold text-right">Balance Due</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4 font-mono text-[13px] text-muted-foreground font-semibold">{inv.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-[10px]">{inv.clientName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-[14px] text-foreground">{inv.clientName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-primary hover:underline cursor-pointer">{inv.bookingId}</td>
                    <td className="px-6 py-4 text-[13px] text-foreground">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-bold text-foreground text-right">
                      ₹{inv.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-bold text-right">
                      <span className={inv.amount - inv.amountPaid > 0 ? "text-amber-500" : "text-muted-foreground"}>
                        ₹{(inv.amount - inv.amountPaid).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <DownloadCloud className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "Transactions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-[12px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Client</th>
                  <th className="px-6 py-4 font-semibold">Method</th>
                  <th className="px-6 py-4 font-semibold">Notes</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-[13px] text-foreground">
                      {new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 font-semibold text-[14px] text-foreground">
                      {tx.clientName}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-foreground">
                      {tx.method}
                    </td>
                    <td className="px-6 py-4 text-[13px] text-muted-foreground">
                      {tx.notes || "-"}
                    </td>
                    <td className="px-6 py-4 text-[14px] font-bold text-emerald-500 text-right">
                      +₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "Advance Tracker" && (
          <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
             Tracking interface for partial booking advances coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
