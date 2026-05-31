"use client";

import { Search, Bell, Plus, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { AddBookingModal } from "@/components/bookings/AddBookingModal";
import { GlobalSearch } from "./GlobalSearch";
import { bookings, leads, clients, teamMembers, packages } from "@/data/mockData";
import type { Booking } from "@/data/mockData";
import {
  flattenBookings,
  flattenLeads,
  flattenClients,
  flattenTeam,
  flattenPackages,
} from "@/lib/exportUtils";
import { useState, useEffect, useMemo } from "react";

export function Header() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<Booking | null>(null);

  useEffect(() => {
    const handleOpen = (e: any) => {
      setBookingToEdit(e.detail?.bookingToEdit || null);
      setIsModalOpen(true);
    };
    window.addEventListener('open-add-booking', handleOpen);
    return () => window.removeEventListener('open-add-booking', handleOpen);
  }, []);

  // Build the full dashboard export payload
  const allDatasets = useMemo(
    () => [
      flattenBookings(bookings),
      flattenLeads(leads),
      flattenClients(clients),
      flattenTeam(teamMembers),
      flattenPackages(packages),
    ],
    []
  );

  return (
    <>
      <header className="h-[72px] bg-card/60 dark:bg-card/40 backdrop-blur-[120px] rounded-2xl flex items-center justify-between px-8 shrink-0 shadow-sm border-none">
      {/* Left: Title + subtitle (Donezo-style) */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
        <p className="text-[13px] text-muted-foreground">Plan, prioritize, and manage your studio bookings.</p>
      </div>

      {/* Right: Actions (Sparklink-style) */}
      <div className="flex items-center gap-3">
        {/* Supercharged Global Search Component */}
        <GlobalSearch />

        {/* Add Booking — Sparklink "+New Product" style */}
        <Button 
          onClick={() => window.dispatchEvent(new CustomEvent('open-add-booking'))}
          className="h-10 px-4 flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-[14px] font-semibold shadow-sm transition-colors border-none"
        >
          <Plus className="h-4 w-4" />
          Add Booking
        </Button>

        {/* Export — Full Dashboard Data */}
        <ExportMenu
          datasets={allDatasets}
          filename="amour-affairs-full-export"
          pdfTitle="Full Dashboard Export — All Data"
          variant="header"
        />

        {/* Mail (Donezo-style) */}
        <button className="h-10 w-10 flex items-center justify-center rounded-xl border border-border/50 bg-card/10 hover:bg-card/20 backdrop-blur-md transition-colors">
          <Mail className="h-[18px] w-[18px] text-foreground" strokeWidth={1.7} />
        </button>

        {/* Notification Bell */}
        <button className="h-10 w-10 relative flex items-center justify-center rounded-xl border border-border/50 bg-card/10 hover:bg-card/20 backdrop-blur-md transition-colors mr-1">
          <Bell className="h-[18px] w-[18px] text-foreground" strokeWidth={1.7} />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-card pulse-glow" />
        </button>

        {/* Theme Toggle replaces User Avatar */}
        <div className="flex items-center pl-3 border-l border-border/50">
          <ThemeToggle />
        </div>
      </div>
      </header>

      <AddBookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        bookingToEdit={bookingToEdit}
        onSuccess={(newBooking, isEdit, clientType) => {
          if (isEdit) {
            const idx = bookings.findIndex(b => b.id === newBooking.id);
            if (idx > -1) bookings[idx] = newBooking;
          } else {
            bookings.unshift(newBooking);
          }
          setIsModalOpen(false);
          window.dispatchEvent(new CustomEvent('booking-synced', { detail: { newBooking, isEdit } }));
        }}
      />
    </>
  );
}
