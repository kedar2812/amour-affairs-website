"use client";

import React, { useState } from 'react';
import { Camera, User, Bell, Settings as SettingsIcon, FileText, Blocks, CreditCard, Check, Link2, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SubTab = "Profile" | "Roles" | "Notifications" | "Pricing" | "Invoice" | "Integrations" | "Billing";

const SETTINGS_TABS = [
  { id: "Profile" as SubTab, name: "Studio Profile", icon: Camera },
  { id: "Roles" as SubTab, name: "Team & Roles", icon: User },
  { id: "Notifications" as SubTab, name: "Notifications", icon: Bell },
  { id: "Pricing" as SubTab, name: "Packages & Pricing", icon: SettingsIcon },
  { id: "Invoice" as SubTab, name: "Invoice Settings", icon: FileText },
  { id: "Integrations" as SubTab, name: "Integrations", icon: Blocks },
  { id: "Billing" as SubTab, name: "Billing & Subscription", icon: CreditCard },
];

const INTEGRATIONS_LIST = [
  { id: "gcal", name: "Google Calendar", desc: "Sync bookings to calendar.", icon: "📅" },
  { id: "whatsapp", name: "WhatsApp Business", desc: "Automated reminders.", icon: "💬" },
  { id: "gdrive", name: "Google Drive", desc: "Auto-backup deliveries.", icon: "📁" },
  { id: "razorpay", name: "Razorpay", desc: "Online payment collection.", icon: "💳" },
  { id: "instagram", name: "Instagram", desc: "Pull lead DMs.", icon: "📸", comingSoon: true }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SubTab>("Profile");
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    gcal: true,
    whatsapp: false,
    gdrive: false,
    razorpay: true
  });

  const toggleIntegration = (id: string) => {
    setIntegrations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full h-full pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 px-2 lg:px-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Configure your studio profile and preferences.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Nav */}
        <div className="lg:w-[260px] shrink-0">
          <div className="flex flex-col space-y-1 sticky top-[120px]">
            {SETTINGS_TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all font-medium text-[14px] ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive ? "opacity-100" : "opacity-70"}`} />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 max-w-[900px]">
          {activeTab === "Profile" && (
            <div className="dash-card p-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Studio Profile</h2>
                <div className="flex items-start gap-8">
                  <div className="flex-1 space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Studio Name</label>
                        <input type="text" defaultValue="Amour Affairs" className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Tagline</label>
                        <input type="text" defaultValue="Photography Studio" className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Email</label>
                        <input type="email" defaultValue="hello@amouraffairs.in" className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50" />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Phone / WhatsApp</label>
                        <input type="text" defaultValue="+91 98765 43210" className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Address</label>
                      <input type="text" defaultValue="Pune, Maharashtra" className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-foreground focus:outline-none focus:border-primary/50" />
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-center gap-3">
                    <div className="h-32 w-32 rounded-xl bg-muted/30 border-2 border-dashed border-border/50 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/50 hover:border-primary/50 transition-colors cursor-pointer group">
                      <Camera className="h-8 w-8 mb-2 group-hover:text-primary transition-colors" />
                      <span className="text-[11px] font-bold uppercase">Upload Logo</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">PNG or JPG max 2MB</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border/50 flex justify-end">
                <Button className="rounded-xl px-6 bg-primary text-primary-foreground font-bold shadow-md h-10">
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {activeTab === "Integrations" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h2 className="text-xl font-bold text-foreground mb-6">Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTEGRATIONS_LIST.map((int) => {
                  const isConnected = integrations[int.id];
                  return (
                    <div key={int.id} className="dash-card p-5 border border-border/50 rounded-xl flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex items-center justify-center text-2xl bg-muted/30 rounded-lg shrink-0">
                            {int.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-[15px] text-foreground flex items-center gap-2">
                              {int.name}
                              {isConnected && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                            </h3>
                            <p className="text-[12px] text-muted-foreground">{int.desc}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
                        {int.comingSoon ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 bg-muted text-muted-foreground rounded uppercase tracking-wide">
                            Coming Soon
                          </span>
                        ) : (
                          <Button 
                            variant={isConnected ? "outline" : "default"}
                            className={`h-8 px-4 w-full rounded-lg text-[12px] font-bold ${isConnected ? 'hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20' : 'bg-primary text-primary-foreground'}`}
                            onClick={() => toggleIntegration(int.id)}
                          >
                            {isConnected ? (
                              <><Unlink className="w-3 h-3 justify-center mr-2"/> Disconnect</>
                            ) : (
                              <><Link2 className="w-3 h-3 justify-center mr-2"/> Connect</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab !== "Profile" && activeTab !== "Integrations" && (
             <div className="dash-card p-12 text-center flex flex-col items-center justify-center space-y-4 animate-in fade-in z-0">
                <SettingsIcon className="w-12 h-12 text-muted-foreground opacity-20" />
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-foreground">{SETTINGS_TABS.find(t => t.id === activeTab)?.name}</h3>
                  <p className="text-sm text-muted-foreground">Configuration panel rendering coming soon.</p>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
