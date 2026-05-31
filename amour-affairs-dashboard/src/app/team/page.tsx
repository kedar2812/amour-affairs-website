"use client";

import React, { useState } from 'react';
import { Search, Plus, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useTeam } from '@/lib/useData';
import { TeamMember } from '@/data/mockData';
import { Drawer } from '@/components/ui/Drawer';

type TabView = "Profile" | "Schedule" | "Performance" | "Payments";

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>("Profile");
  const { data: teamMembers } = useTeam(true);

  const filteredTeam = teamMembers.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'On Shoot': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Available': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Editing': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'On Leave': return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const handleMemberClick = (member: TeamMember) => {
    setActiveTab("Profile");
    setSelectedMember(member);
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Manage your photographers, videographers and editors.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search team..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-[240px] pl-9 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground border-none shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        {[
          { label: "Total Members", val: teamMembers.length },
          { label: "On Shoot Today", val: teamMembers.filter(m => m.status === "On Shoot").length },
          { label: "Available Now", val: teamMembers.filter(m => m.status === "Available").length },
          { label: "On Leave", val: teamMembers.filter(m => m.status === "On Leave").length }
        ].map(stat => (
          <div key={stat.label} className="dash-card p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
            <span className="text-xl font-bold text-foreground">{stat.val}</span>
          </div>
        ))}
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 content-start pb-12">
        {filteredTeam.map(member => (
          <div key={member.id} onClick={() => handleMemberClick(member)} className="dash-card p-6 cursor-pointer hover:-translate-y-1 transition-transform group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4">
                <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">{member.avatarInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-[15px] text-foreground group-hover:text-primary transition-colors">{member.name}</h3>
                  <p className="text-[12px] text-muted-foreground font-medium">{member.role}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border ${getStatusColor(member.status)}`}>
                {member.status}
              </span>
              {member.currentAssignment && (
                <p className="text-[12px] text-muted-foreground mt-2 flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 mt-0.5" />
                  <span className="truncate">{member.currentAssignment}</span>
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-border/50">
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">Upcoming</p>
                <p className="text-[13px] font-bold text-foreground">{member.upcomingShootsCount} shoots</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/50 rounded-full text-muted-foreground"><Phone className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={!!selectedMember} onClose={() => setSelectedMember(null)} width="480px" title={selectedMember?.name}>
        {selectedMember && (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-border/50 shrink-0">
              <div className="flex gap-4 items-center">
                <Avatar className="h-16 w-16 shadow-md">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">{selectedMember.avatarInitials}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{selectedMember.name}</h2>
                  <p className="text-[13px] text-muted-foreground">{selectedMember.role}</p>
                </div>
              </div>
            </div>

            {/* Inner Tabs */}
            <div className="px-6 py-3 border-b border-border/50 flex gap-6 shrink-0">
              {(["Profile", "Schedule", "Performance", "Payments"] as TabView[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-[13px] font-bold pb-2 border-b-2 transition-colors ${activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {activeTab === "Profile" && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Bio</h4>
                    <p className="text-[13px] text-foreground leading-relaxed">{selectedMember.bio}</p>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Equipment</h4>
                    <div className="flex flex-col gap-2 bg-muted/30 p-4 rounded-xl border border-border/50">
                      {selectedMember.equipment.map((eq, i) => (
                        <div key={i} className="text-[13px] font-medium text-foreground">{eq}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "Schedule" && (
                <div className="text-center text-muted-foreground py-12 text-[13px]">
                  Calendar tracking integration coming soon using date-fns.
                </div>
              )}
              {activeTab !== "Profile" && activeTab !== "Schedule" && (
                <div className="text-center text-muted-foreground py-12 text-[13px]">
                  {activeTab} data mock population coming soon.
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
