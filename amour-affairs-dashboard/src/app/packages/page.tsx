"use client";

import React, { useState } from 'react';
import { Search, Plus, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePackages } from '@/lib/useData';
import { Package } from '@/data/mockData';
import { Drawer } from '@/components/ui/Drawer';

export default function PackagesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const { data: packages } = usePackages({ all: true });
  
  const filteredPackages = packages.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'Wedding': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Pre-Wedding': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
      case 'Corporate': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1540px] mx-auto w-full h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Packages</h1>
          <p className="text-[14px] text-muted-foreground mt-1">Design and manage your service offerings.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search packages..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-[240px] pl-9 pr-4 bg-card border border-border/50 rounded-xl text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button variant="outline" className="h-10 px-4 rounded-xl border-border/50 bg-card/10">
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </Button>
          <Button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground border-none shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Package
          </Button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
        {filteredPackages.map(pkg => (
          <div key={pkg.id} className="dash-card flex flex-col h-full group">
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold border ${getCategoryColor(pkg.category)}`}>
                  {pkg.category}
                </span>
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${pkg.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                   <span className="text-[10px] uppercase font-bold text-muted-foreground">{pkg.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>

              <h2 className="text-xl font-bold text-foreground mb-1">{pkg.name}</h2>
              <p className="text-2xl font-bold text-primary mb-3">₹{pkg.price.toLocaleString('en-IN')}</p>
              <p className="text-[13px] text-muted-foreground mb-6 line-clamp-2">{pkg.description}</p>

              <div className="mt-auto space-y-2 mb-6">
                {pkg.inclusions.slice(0, 4).map((inc, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-[13px] text-foreground font-medium">{inc}</span>
                  </div>
                ))}
                {pkg.inclusions.length > 4 && (
                  <div className="text-[12px] text-muted-foreground font-semibold px-6 pt-1">
                    + {pkg.inclusions.length - 4} more inclusions
                  </div>
                )}
              </div>

              <div className="bg-muted/30 p-3 rounded-lg border border-border/50 mb-6">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground">Popularity</span>
                  <span className="text-[11px] font-bold text-foreground">{pkg.popularity}% ({pkg.bookingsCount} bookings)</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pkg.popularity}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-auto">
                <Button className="flex-1 rounded-xl bg-muted/50 text-foreground hover:bg-muted font-medium border border-border/50" onClick={() => setSelectedPackage(pkg)}>
                  Edit Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Drawer isOpen={!!selectedPackage} onClose={() => setSelectedPackage(null)} width="480px" title="Edit Package">
        {selectedPackage && (
          <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Package Name</label>
                <input type="text" defaultValue={selectedPackage.name} className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Price (₹)</label>
                  <input type="number" defaultValue={selectedPackage.price} className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
                </div>
                <div>
                  <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Category</label>
                  <select defaultValue={selectedPackage.category} className="w-full h-10 px-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50">
                    <option value="Wedding">Wedding</option>
                    <option value="Pre-Wedding">Pre-Wedding</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Portrait">Portrait</option>
                    <option value="Maternity">Maternity</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Description</label>
                <textarea defaultValue={selectedPackage.description} rows={3} className="w-full p-3 bg-muted/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>

              <div className="pt-4 border-t border-border/50">
                <Button className="w-full bg-primary text-primary-foreground font-bold rounded-xl h-10">Save Changes</Button>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
