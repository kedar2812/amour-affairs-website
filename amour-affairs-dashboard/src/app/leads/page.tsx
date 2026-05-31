"use client";

import React, { useState } from 'react';
import { Search, Plus, Phone, Mail, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLeads } from '@/lib/useData';
import { Lead } from '@/data/mockData';
import { Drawer } from '@/components/ui/Drawer';
import { motion, AnimatePresence } from 'framer-motion';

const LEAD_STAGES = ["New Inquiry", "Contacted", "Consultation Scheduled", "Proposal Sent", "Won", "Lost"] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const columnVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 350, damping: 28 }
  }
};

const cardContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const cardItemVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 }
  }
};

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState<"Pipeline" | "List">("Pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { data: leads } = useLeads();

  const filteredLeads = leads.filter(l => 
    l.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'Instagram': return <Camera className="h-3 w-3" />;
      case 'WhatsApp': return <Phone className="h-3 w-3" />;
      default: return <Mail className="h-3 w-3" />;
    }
  };

  const getDaysInStage = (movedAt: string) => {
    const ms = new Date().getTime() - new Date(movedAt).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Track and convert your inquiries.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-[240px] pl-9 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-xl border-border/50 bg-card/10 backdrop-blur-md">
            Import
          </Button>
          <Button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground border-none shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {[
          { label: "Total Leads", val: "58" },
          { label: "This Month", val: "14" },
          { label: "Conversion Rate", val: "34.5%" },
          { label: "Pipeline Value", val: "₹42.6L" }
        ].map(stat => (
          <div key={stat.label} className="dash-card p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
            <span className="text-xl font-bold text-foreground">{stat.val}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-card/50 border border-border/50 p-1 rounded-xl w-max shrink-0 relative z-0">
        {(["Pipeline", "List"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 z-10 ${
              activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="leads-tab-active"
                className="absolute inset-0 bg-card shadow-sm rounded-lg -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {tab === "Pipeline" ? "Pipeline" : "List View"}
          </button>
        ))}
      </div>

      {/* Main Content Areas */}
      <AnimatePresence mode="wait">
        {activeTab === "Pipeline" ? (
          <motion.div 
            key="pipeline"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={containerVariants}
            className="flex-1 overflow-x-auto min-h-[500px]"
          >
            <div className="flex gap-6 h-full pb-4 items-start w-max">
              {LEAD_STAGES.map(stage => {
                const stageLeads = filteredLeads.filter(l => l.stage === stage);
                return (
                  <motion.div 
                    key={stage} 
                    variants={columnVariants}
                    className="flex flex-col w-[300px] min-w-[300px] bg-muted/20 border border-border/20 rounded-xl p-3 h-full"
                  >
                    <div className="flex items-center justify-between px-2 mb-3">
                      <h3 className="font-bold text-[14px] text-foreground">{stage}</h3>
                      <span className="text-[12px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                    </div>
                    
                    <motion.div 
                      variants={cardContainerVariants}
                      className="flex flex-col gap-3"
                    >
                      {stageLeads.map(lead => {
                        const days = getDaysInStage(lead.movedToStageAt);
                        const isStale = days > 5;
                        const isCritical = days > 10;
                        
                        return (
                          <motion.div 
                            key={lead.id} 
                            variants={cardItemVariants}
                            whileHover={{ y: -3, scale: 1.015, boxShadow: "0 10px 20px -10px rgba(0,0,0,0.06)" }}
                            whileTap={{ scale: 0.995 }}
                            onClick={() => setSelectedLead(lead)} 
                            className="dash-card p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-primary/20 text-primary text-[9px] font-bold">{lead.clientName.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-[13px] text-foreground truncate max-w-[120px]">{lead.clientName}</span>
                              </div>
                            </div>
                            
                            <p className="text-[11px] text-muted-foreground font-medium mb-3">{lead.eventType} • {new Date(lead.eventDate).toLocaleDateString('en-IN', {month: 'short', year: 'numeric'})}</p>
                            
                            <div className="flex items-center justify-between pt-3 border-t border-border/50">
                              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded text-[10px] text-muted-foreground font-medium">
                                {getSourceIcon(lead.source)} {lead.source}
                              </div>
                              <span className={`text-[10px] font-bold ${isCritical ? 'text-red-500' : isStale ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                {days} days
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="dash-card p-8 text-center text-muted-foreground min-h-[400px]"
          >
            List view coming soon.
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer isOpen={!!selectedLead} onClose={() => setSelectedLead(null)} title={selectedLead?.clientName || "Lead Details"}>
        {selectedLead && (
          <div className="p-6">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Event Details</h4>
            <div className="bg-muted/30 border border-border/50 p-4 rounded-xl mb-6">
              <p className="text-[14px] text-foreground font-semibold">{selectedLead.eventType}</p>
              <p className="text-[12px] text-muted-foreground">Estimated: {new Date(selectedLead.eventDate).toLocaleDateString('en-IN')}</p>
              <p className="text-[13px] text-primary font-bold mt-2">{selectedLead.budgetRange}</p>
            </div>

            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl h-12 shadow-md">
              Convert to Booking
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
