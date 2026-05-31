"use client";

import React, { useState } from 'react';
import { Search, Plus, Star, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useClients } from '@/lib/useData';
import { Client } from '@/data/mockData';
import { Drawer } from '@/components/ui/Drawer';
import { motion } from 'framer-motion';

type TabView = "Overview" | "Booking History" | "Payments" | "Gallery Deliveries" | "Notes";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 280, damping: 24 }
  }
};

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("Overview");
  const { data: clients } = useClients();

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.phone.includes(searchQuery)
  );

  const getAvatarColor = (type: string) => {
    switch (type) {
      case 'Wedding': return 'bg-amber-500/20 text-amber-500';
      case 'Corporate': return 'bg-purple-500/20 text-purple-500';
      default: return 'bg-primary/20 text-primary';
    }
  };

  const handleClientClick = (client: Client) => {
    setActiveTab("Overview"); // reset tab when opening new client
    setSelectedClient(client);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Your client relationships and history.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-[280px] pl-9 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-xl border-border/50 bg-card/10">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground border-none">
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 content-start pb-12"
      >
        {filteredClients.map(client => (
          <motion.div 
            key={client.id} 
            variants={cardVariants}
            whileHover={{ y: -4, scale: 1.01, boxShadow: "0 12px 24px -10px rgba(0,0,0,0.08)" }}
            whileTap={{ scale: 0.995 }}
            onClick={() => handleClientClick(client)} 
            className="dash-card p-6 cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                <AvatarFallback className={`font-bold text-sm ${getAvatarColor(client.type)}`}>
                  {client.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getAvatarColor(client.type)} border-opacity-50`}>
                {client.type}
              </span>
            </div>
            
            <h3 className="font-bold text-[16px] text-foreground mb-1 group-hover:text-primary transition-colors">{client.name}</h3>
            <p className="text-[13px] text-muted-foreground font-mono">{client.phone}</p>
            
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border/50">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Bookings</p>
                <p className="text-[15px] font-bold text-foreground">{client.totalBookings}</p>
              </div>
              <div className="w-[1px] h-8 bg-border/50" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Spend</p>
                <p className="text-[15px] font-bold text-foreground">₹{(client.totalSpend / 100000).toFixed(1)}L</p>
              </div>
            </div>

            {client.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {client.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">{tag}</span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      <Drawer isOpen={!!selectedClient} onClose={() => setSelectedClient(null)} width="560px" title={selectedClient?.name}>
        {selectedClient && (
          <div className="flex flex-col h-full">
            {/* Drawer Header Block */}
            <div className="p-6 border-b border-border/50 flex gap-4 items-center shrink-0">
              <Avatar className="h-16 w-16 shadow-lg">
                <AvatarFallback className={`text-xl font-bold ${getAvatarColor(selectedClient.type)}`}>{selectedClient.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-foreground">{selectedClient.name}</h2>
                  {selectedClient.tags.includes("VIP") && (
                    <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
                  <span className="font-mono">{selectedClient.phone}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{selectedClient.email}</span>
                </div>
              </div>
            </div>

            {/* Inner Tabs */}
            <div className="px-6 py-3 border-b border-border/50 flex gap-6 overflow-x-auto shrink-0 hide-scrollbar relative">
              {(["Overview", "Booking History", "Payments", "Gallery Deliveries", "Notes"] as TabView[]).map(tab => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative text-[13px] font-bold pb-2 transition-colors whitespace-nowrap ${isActive ? "text-primary font-extrabold" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {tab}
                    {isActive && (
                      <motion.div 
                        layoutId="client-drawer-tab"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content Switcher */}
            <div className="p-6 flex-1 overflow-y-auto">
              {activeTab === "Overview" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 border border-border/50 p-4 rounded-xl">
                      <p className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase mb-1">Total Lifetime Spend</p>
                      <p className="text-2xl font-bold text-emerald-500">₹{selectedClient.totalSpend.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-muted/30 border border-border/50 p-4 rounded-xl">
                      <p className="text-[11px] text-muted-foreground font-bold tracking-wider uppercase mb-1">Total Bookings</p>
                      <p className="text-2xl font-bold text-foreground">{selectedClient.totalBookings}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Contact Details</h4>
                    <div className="dash-card border border-border/50 rounded-xl divide-y divide-border/50">
                      <div className="flex items-center justify-between p-3">
                        <span className="text-[13px] text-muted-foreground font-medium">WhatsApp</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-mono text-foreground">{selectedClient.whatsapp}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><Copy className="h-3 w-3" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3">
                        <span className="text-[13px] text-muted-foreground font-medium">City</span>
                        <span className="text-[13px] text-foreground font-medium">{selectedClient.city}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {activeTab !== "Overview" && (
                <div className="text-center text-muted-foreground py-12 text-[13px]">
                  {activeTab} view population from mock data coming soon.
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
