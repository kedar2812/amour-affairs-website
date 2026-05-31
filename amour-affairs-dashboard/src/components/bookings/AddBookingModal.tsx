"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { bookingSchema, BookingFormData } from "@/lib/bookingSchema";
import { clients as mockClients, packages as mockPackages, teamMembers as mockTeam, bookings as mockBookings, Booking } from "@/data/mockData";
import { useToast } from "@/lib/ToastContext";
import { DiscardModal } from "@/components/ui/DiscardModal";
import { X, Search, Calendar as CalendarIcon, Clock, MapPin, Users, IndianRupee, Check, Plus, AlertCircle, Trash2, Camera, Video, MonitorPlay } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Styled Components / Tokens (From Prompt)
const InputClass = "w-full bg-background border border-border rounded-lg text-foreground px-4 py-2.5 text-[14px] transition-colors focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15 disabled:bg-card disabled:text-muted-foreground disabled:cursor-not-allowed";
const LabelClass = "block text-muted-foreground text-[13px] font-medium mb-1.5";
const ErrorText = ({ children }: { children: React.ReactNode }) => children ? <p className="text-red-500 font-medium text-[12px] mt-1.5">{children}</p> : null;

// The Venue array
const Venues = [
  "The Ritz-Carlton Pune", "JW Marriott Hinjawadi", "Lavasa City", "Empress Garden Pune",
  "Conrad Pune", "Taj Blue Diamond", "Hyatt Regency Pune", "The Westin Pune",
  "Corinthians Resort", "Oakwood Premier Pune", "Radisson Blu Kharadi",
  "Le Méridien Pune", "Aga Khan Palace", "Baner Hills", "Panchgani",
  "Mahabaleshwar", "Client's Residence - Koregaon Park",
  "Client's Residence - Baner", "Outdoor Location - Sinhagad Fort"
];

const EventTypes = ["Wedding", "Pre-Wedding", "Corporate", "Portrait", "Maternity", "Engagement", "Family"] as const;

interface AddBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingToEdit?: Booking | null;
  onSuccess: (booking: Booking, isEdit: boolean, clientType: "new" | "existing") => void;
}

export function AddBookingModal({ isOpen, onClose, bookingToEdit, onSuccess }: AddBookingModalProps) {
  const { showToast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");
  const [showDiscard, setShowDiscard] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  
  // Combobox states
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
  const [venueSearch, setVenueSearch] = useState("");
  const [showVenueDropdown, setShowVenueDropdown] = useState(false);

  const { register, handleSubmit, control, watch, setValue, trigger, reset, formState: { errors, isDirty } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema) as any,
    defaultValues: {
      clientType: "new",
      clientCity: "Pune",
      venueCity: "Pune",
      advancePaid: false,
      status: "Confirmed",
      addOns: [],
      assignedPhotographers: [],
      assignedVideographers: [],
      assignedEditors: []
    }
  });

  const formData = watch();

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      if (bookingToEdit) {
        reset({
          clientType: "existing",
          existingClientId: bookingToEdit.clientId,
          eventType: bookingToEdit.eventType,
          eventDate: bookingToEdit.date.split('T')[0],
          eventEndDate: bookingToEdit.endDate.split('T')[0],
          startTime: bookingToEdit.date.split('T')[1].substring(0,5),
          endTime: bookingToEdit.endDate.split('T')[1].substring(0,5),
          venueName: bookingToEdit.venue,
          venueCity: bookingToEdit.city,
          packageId: bookingToEdit.packageId,
          totalAmount: bookingToEdit.payment.total,
          advanceAmount: bookingToEdit.payment.paid,
          advancePaid: bookingToEdit.payment.paid > 0,
          status: bookingToEdit.status,
          internalNotes: bookingToEdit.notes || "",
          assignedPhotographers: bookingToEdit.teamAssignedIds
        } as any);
      } else {
        reset({
          clientType: "new",
          clientCity: "Pune",
          venueCity: "Pune",
          advancePaid: false,
          status: "Confirmed",
          addOns: [],
          assignedPhotographers: [],
          assignedVideographers: [],
          assignedEditors: []
        });
      }
    }
  }, [isOpen, bookingToEdit, reset]);

  // Live Auto-Calculations
  useEffect(() => {
    if (formData.packageId) {
      const selectedPkg = mockPackages.find(p => p.id === formData.packageId);
      if (selectedPkg) {
        let total = formData.customAmount !== undefined ? formData.customAmount : selectedPkg.price;
        
        // Add Add-on costs
        if (formData.addOns && formData.addOns.length > 0) {
          selectedPkg.addons.forEach(addon => {
            if (formData.addOns!.includes(addon.name)) {
              total += addon.price;
            }
          });
        }
        
        setValue("totalAmount", total);
      }
    }
  }, [formData.packageId, formData.customAmount, formData.addOns, setValue]);

  if (!isOpen && !showDiscard) return null;

  const handleCloseAttempt = () => {
    if (isDirty) setShowDiscard(true);
    else onClose();
  };

  const stepFields: Record<number, (keyof BookingFormData)[]> = {
    1: ["clientType", "clientName", "clientPhone", "clientEmail", "existingClientId"],
    2: ["eventType", "eventDate", "startTime", "endTime", "venueName"],
    3: ["packageId", "assignedPhotographers"],
    4: ["totalAmount", "advanceAmount", "status"],
  };

  const goNext = async () => {
    const fieldsToValidate = stepFields[currentStep];
    const valid = await trigger(fieldsToValidate);
    
    // Explicit manual bypass blocks for Zod superRefine partial gaps
    if (currentStep === 1) {
      if (formData.clientType === "existing" && !formData.existingClientId) return;
      if (formData.clientType === "new" && (!formData.clientName || formData.clientName.trim() === "")) return;
      if (formData.clientType === "new" && (!formData.clientPhone || !/^[6-9]\d{9}$/.test(formData.clientPhone))) return;
    }
    if (currentStep === 2) {
      if (!formData.eventDate || !formData.startTime || !formData.endTime || !formData.venueName) return;
    }
    if (currentStep === 3) {
      if (!formData.packageId || !formData.assignedPhotographers || formData.assignedPhotographers.length === 0) return;
    }

    if (!valid) return;
    
    setStepDirection("forward");
    setCurrentStep(s => s + 1);
  };

  const goBack = () => {
    setStepDirection("back");
    setCurrentStep(s => s - 1);
  };

  const executeFinalSubmit = async (data: BookingFormData) => {
    setIsSubmittingForm(true);
    // Simulate 300ms creation logic
    await new Promise(r => setTimeout(r, 400));
    
    const newId = bookingToEdit ? bookingToEdit.id : `#BK-${String(mockBookings.length + 1043).padStart(4, '0')}`;
    
    let clientObj: any;
    if (data.clientType === "existing") {
      clientObj = mockClients.find(c => c.id === data.existingClientId);
    } else {
      clientObj = {
        id: `CL-${Date.now().toString().slice(-4)}`,
        name: data.clientName,
        phone: data.clientPhone,
        email: data.clientEmail || "",
        whatsapp: data.clientWhatsApp || data.clientPhone,
        instagram: data.clientInstagram || "",
        type: data.eventType === "Corporate" ? "Corporate" : "Wedding",
        city: "Pune",
        totalBookings: 1,
        totalSpend: data.totalAmount,
        lastShootDate: data.eventDate,
        rating: 0,
        tags: ["New Client"]
      };
    }

    const pkg = mockPackages.find(p => p.id === data.packageId)!;

    const newBooking: Booking = {
      id: newId,
      clientId: clientObj.id,
      clientName: clientObj.name,
      eventType: data.eventType,
      date: `${data.eventDate}T${data.startTime}:00`,
      endDate: data.eventEndDate ? `${data.eventEndDate}T${data.endTime}:00` : `${data.eventDate}T${data.endTime}:00`,
      venue: data.venueName,
      city: data.venueCity || "Pune",
      packageId: pkg.id,
      packageName: pkg.name,
      teamAssignedIds: [...data.assignedPhotographers, ...(data.assignedVideographers || []), ...(data.assignedEditors || [])],
      amount: data.totalAmount,
      status: data.status as any,
      notes: data.internalNotes,
      timeline: {
        inquiry: new Date().toISOString().split('T')[0],
        consultation: null,
        confirmed: data.status === "Confirmed" ? new Date().toISOString().split('T')[0] : null,
        shoot: null,
        editing: null,
        delivered: null
      },
      payment: {
        total: data.totalAmount,
        paid: data.advanceAmount || 0,
        due: data.totalAmount - (data.advanceAmount || 0)
      }
    };

    onSuccess(newBooking, !!bookingToEdit, data.clientType as "new" | "existing");
    showToast(`Booking ${newId} ${bookingToEdit ? 'updated' : 'created'} successfully!`, "success");
    setIsSubmittingForm(false);
  };

  const variants = {
    enter: (dir: "forward" | "back") => ({ x: dir === "forward" ? 30 : -30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: "forward" | "back") => ({ x: dir === "forward" ? -30 : 30, opacity: 0 }),
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-0">
        
        {/* Modal Shell */}
        <div className="bg-card border border-border rounded-2xl w-full max-w-[680px] max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
            <h2 className="text-xl font-bold text-foreground tracking-wide">{bookingToEdit ? 'Edit Booking' : 'New Booking'}</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold tracking-wide text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">Step {currentStep} of 4</span>
              <button onClick={handleCloseAttempt} className="text-muted-foreground hover:text-foreground transition cursor-pointer bg-muted/30 p-1.5 rounded-full hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1 bg-background flex">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`flex-1 h-full transition-colors duration-300 ${s <= currentStep ? 'bg-primary' : 'bg-transparent'}`} />
            ))}
          </div>

          {/* Form Content Area */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative p-8">
            <AnimatePresence mode="wait" custom={stepDirection}>
              <motion.div
                key={currentStep}
                custom={stepDirection}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="w-full flex tracking-wide flex-col"
              >
                {currentStep === 1 && <Step1_ClientInfo formData={formData} register={register} errors={errors} setValue={setValue} clientSearch={clientSearch} setClientSearch={setClientSearch} showClientDropdown={showClientDropdown} setShowClientDropdown={setShowClientDropdown} />}
                {currentStep === 2 && <Step2_EventDetails formData={formData} register={register} errors={errors} setValue={setValue} venueSearch={venueSearch} setVenueSearch={setVenueSearch} showVenueDropdown={showVenueDropdown} setShowVenueDropdown={setShowVenueDropdown} watch={watch} />}
                {currentStep === 3 && <Step3_PackageTeam formData={formData} register={register} errors={errors} setValue={setValue} />}
                {currentStep === 4 && <Step4_PaymentNotes formData={formData} register={register} errors={errors} setValue={setValue} watch={watch} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Sticky Summary Strip (Only visible on step 3) */}
          <AnimatePresence>
            {currentStep === 3 && (
              <motion.div initial={{ y: 50 }} animate={{ y: 0 }} exit={{ y: 50 }} className="bg-background border-t border-border px-6 py-3 flex items-center justify-between text-[13px] font-medium text-muted-foreground z-10 relative shadow-[0_-5px_20px_rgba(0,0,0,0.1)]">
                <div>
                  <span className="text-foreground bg-muted px-2 py-0.5 rounded mr-2">Package: {mockPackages.find(p => p.id === formData.packageId)?.name || 'None'}</span>
                  {formData.addOns && formData.addOns.length > 0 && <span className="mr-2 border-l border-border pl-2">Add-ons: {formData.addOns.length}</span>}
                  <span className="border-l border-border pl-2">Team: {(formData.assignedPhotographers?.length || 0) + (formData.assignedVideographers?.length || 0) + (formData.assignedEditors?.length || 0)} assigned</span>
                </div>
                <div className="text-primary text-[15px] font-bold tracking-wider">
                  Total: ₹{(formData.totalAmount || 0).toLocaleString('en-IN')}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between rounded-b-2xl z-20">
            {currentStep > 1 ? (
              <button type="button" onClick={goBack} className="px-5 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-muted transition">
                Back
              </button>
            ) : <div />}

            <button
              onClick={currentStep < 4 ? goNext : handleSubmit(executeFinalSubmit)}
              disabled={isSubmittingForm}
              className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm tracking-wide hover:bg-primary/90 transition shadow-lg shadow-primary/20 disabled:opacity-70 flex items-center gap-2"
            >
              {isSubmittingForm ? (
                <><div className="h-4 w-4 rounded-full border-2 border-primary-foreground/20 border-t-primary-foreground animate-spin" /> {bookingToEdit ? 'Saving' : 'Creating'}...</>
              ) : currentStep < 4 ? "Next Step" : (bookingToEdit ? "Save Changes" : "Create Booking")}
            </button>
          </div>
        </div>

      </div>
      
      <DiscardModal 
        isOpen={showDiscard} 
        onClose={() => setShowDiscard(false)} 
        onDiscard={() => { setShowDiscard(false); onClose(); }} 
      />
    </>
  );
}

// ----------------------------------------------------
// STEP COMPONENTS
// ----------------------------------------------------

function Step1_ClientInfo({ formData, register, errors, setValue, clientSearch, setClientSearch, showClientDropdown, setShowClientDropdown }: any) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-medium text-foreground tracking-wide mb-6">Who is this booking for?</h3>
        
        {/* Toggle Pill */}
        <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border max-w-[400px]">
          <button type="button" onClick={() => setValue('clientType', 'existing')} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${formData.clientType === 'existing' ? 'bg-muted text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}>Existing Client</button>
          <button type="button" onClick={() => setValue('clientType', 'new')} className={`flex-1 py-2 text-sm font-medium rounded-md transition ${formData.clientType === 'new' ? 'bg-muted text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}>New Client</button>
        </div>
      </div>

      {formData.clientType === "existing" ? (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
          <label className={LabelClass}>Search Client Profile</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true); }}
              onFocus={() => setShowClientDropdown(true)}
              placeholder="Start typing name or phone..."
              className={`${InputClass} pl-10 border-border bg-background`}
            />
            
            {showClientDropdown && clientSearch.length > 0 && (
              <div className="absolute top-12 left-0 w-full bg-card border border-border shadow-xl rounded-lg z-50 max-h-60 overflow-y-auto">
                {mockClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)).length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">No clients found.</div>
                ) : (
                  mockClients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch)).map(c => (
                    <div key={c.id} onClick={() => { setValue("existingClientId", c.id); setClientSearch(c.name); setShowClientDropdown(false); }} className="p-3 border-b border-border last:border-0 hover:bg-muted cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/20 text-primary border border-primary/30">{c.name.substring(0,2)}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-bold text-foreground">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground bg-background px-2 py-1 rounded">{c.totalBookings} past bookings</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          {errors.existingClientId && <ErrorText>{errors.existingClientId.message as string}</ErrorText>}

          {/* Selected Summary */}
          {formData.existingClientId && (
            <div className="mt-4 bg-background border border-border rounded-xl p-5 flex items-start gap-4">
              <Avatar className="h-14 w-14 ring-2 ring-primary/30"><AvatarFallback className="text-lg bg-card border border-border"> {mockClients.find(c => c.id === formData.existingClientId)?.name.substring(0,2)}</AvatarFallback></Avatar>
              <div className="flex flex-col gap-1">
                <span className="text-lg font-bold text-foreground tracking-wide">{mockClients.find(c => c.id === formData.existingClientId)?.name}</span>
                <span className="text-sm text-muted-foreground font-mono">{mockClients.find(c => c.id === formData.existingClientId)?.phone}</span>
                <span className="text-xs text-primary font-semibold mt-1 uppercase tracking-wider">Total Lifetime Spend: ₹{mockClients.find(c => c.id === formData.existingClientId)?.totalSpend.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}
          
          <button type="button" onClick={() => setValue('clientType', 'new')} className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 text-left w-fit mt-2">Not the right person? Add new client.</button>

        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={LabelClass}>Full Name *</label>
              <input type="text" {...register("clientName")} className={`${InputClass} ${errors.clientName ? '!border-red-500 ring-2 ring-red-500/20' : ''}`} placeholder="e.g. Rahul Sharma" />
              {errors.clientName && <ErrorText>{errors.clientName.message as string}</ErrorText>}
            </div>
            <div>
              <label className={LabelClass}>Phone Number *</label>
              <input type="tel" {...register("clientPhone")} className={`${InputClass} ${errors.clientPhone ? '!border-red-500 ring-2 ring-red-500/20' : ''}`} placeholder="98765 43210" />
              {errors.clientPhone && <ErrorText>{errors.clientPhone.message as string}</ErrorText>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={LabelClass}>Email Address <span className="text-muted-foreground/50 font-normal">(Optional)</span></label>
              <input type="email" {...register("clientEmail")} className={`${InputClass} ${errors.clientEmail ? '!border-red-500 ring-2 ring-red-500/20' : ''}`} placeholder="client@example.com" />
              {errors.clientEmail && <ErrorText>{errors.clientEmail.message as string}</ErrorText>}
            </div>
            <div>
              <label className={LabelClass}>WhatsApp Number</label>
              <input type="tel" {...register("clientWhatsApp")} className={InputClass} placeholder="+91" />
              <button type="button" onClick={() => setValue("clientWhatsApp", formData.clientPhone)} className="text-[11px] text-muted-foreground mt-1.5 hover:text-foreground transition block">Fill same as Phone Number ↑</button>
            </div>
          </div>
          <div>
            <label className={LabelClass}>Instagram Handle <span className="text-muted-foreground/50 font-normal">(Optional)</span></label>
            <input type="text" {...register("clientInstagram")} className={InputClass} placeholder="@username" />
          </div>
        </div>
      )}
    </div>
  );
}


function Step2_EventDetails({ formData, register, errors, setValue, venueSearch, setVenueSearch, showVenueDropdown, setShowVenueDropdown }: any) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-medium tracking-wide mb-6 text-foreground">Tell us about the event</h3>
        
        {/* Event Type Segmented Control */}
        <label className={LabelClass}>Event Type *</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {EventTypes.map(type => (
            <button
               key={type}
               type="button"
               onClick={() => setValue("eventType", type)}
               className={`px-4 py-2 rounded-full text-sm font-medium transition pointer-events-auto border ${formData.eventType === type ? 'bg-primary/10 text-primary border-primary/30 shadow-inner' : 'bg-background text-muted-foreground border-border hover:border-primary/50'}`}
            >
               {type}
            </button>
          ))}
        </div>
        {errors.eventType && <ErrorText>{errors.eventType.message as string}</ErrorText>}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className={LabelClass}>Event Start Date *</label>
          <div className="relative">
             <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
             <input type="date" {...register("eventDate")} className={`${InputClass} pl-10 custom-date-input uppercase font-mono tracking-wider text-sm ${errors.eventDate ? '!border-red-500 ring-2 ring-red-500/20' : ''}`} />
          </div>
          {errors.eventDate && <ErrorText>{errors.eventDate.message as string}</ErrorText>}
        </div>
        
        {formData.eventType === "Wedding" && (
          <div className="animate-in fade-in zoom-in-95">
            <label className={LabelClass}>Event End Date <span className="font-normal text-muted-foreground/50">(Multi-day)</span></label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
              <input type="date" {...register("eventEndDate")} className={`${InputClass} pl-10 custom-date-input uppercase font-mono tracking-wider text-sm ${errors.eventEndDate ? '!border-red-500 ring-2 ring-red-500/20' : ''}`} />
            </div>
            {errors.eventEndDate && <ErrorText>{errors.eventEndDate.message as string}</ErrorText>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 p-4 bg-background rounded-xl border border-border">
        <div>
          <label className={LabelClass}>Start Time *</label>
          <div className="relative">
            <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
            <input type="time" {...register("startTime")} className={`${InputClass} pl-10 font-mono tracking-wider ${errors.startTime ? '!border-red-500 ring-2 ring-red-500/20' : ''}`} />
          </div>
          {errors.startTime && <ErrorText>{errors.startTime.message as string}</ErrorText>}
        </div>
        <div>
           <label className={LabelClass}>End Time *</label>
           <div className="relative">
             <Clock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
             <input type="time" {...register("endTime")} className={`${InputClass} pl-10 font-mono tracking-wider ${errors.endTime ? '!border-red-500 ring-2 ring-red-500/20' : ''}`} />
           </div>
           {errors.endTime && <ErrorText>{errors.endTime.message as string}</ErrorText>}
        </div>
        
        {formData.startTime && formData.endTime && (
          <div className="col-span-2 text-right">
             <span className="text-xs bg-muted/50 text-foreground font-mono rounded px-2 py-1">Shift Duration Configured</span>
          </div>
        )}
      </div>

      <div>
        <label className={LabelClass}>Venue Name *</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground pointer-events-none" />
          <input 
            type="text" 
            {...register("venueName")}
            onChange={(e) => { setValue("venueName", e.target.value); setVenueSearch(e.target.value); setShowVenueDropdown(true); }}
            onFocus={() => setShowVenueDropdown(true)}
            placeholder="Search venue..." 
            className={`${InputClass} pl-10 ${errors.venueName ? '!border-red-500 ring-2 ring-red-500/20' : ''}`} 
          />
          {showVenueDropdown && venueSearch.length > 0 && (
            <div className="absolute top-12 left-0 w-full bg-card border border-border shadow-xl rounded-lg z-50 max-h-48 overflow-y-auto py-1">
              {Venues.filter(v => v.toLowerCase().includes(venueSearch.toLowerCase())).map(v => (
                <div key={v} onClick={() => { setValue("venueName", v); setVenueSearch(v); setShowVenueDropdown(false); }} className="px-4 py-2 hover:bg-muted cursor-pointer text-sm text-foreground">
                  {v}
                </div>
              ))}
            </div>
          )}
        </div>
        {errors.venueName && <ErrorText>{errors.venueName.message as string}</ErrorText>}
      </div>

      <div className="grid grid-cols-2 gap-6">
         <div>
            <label className={LabelClass}>Venue City</label>
            <input type="text" {...register("venueCity")} className={InputClass} />
         </div>
         {["Wedding", "Engagement", "Corporate"].includes(formData.eventType) && (
           <div className="animate-in fade-in">
              <label className={LabelClass}>Expected Guests <span className="font-normal text-muted-foreground/50">(Optional)</span></label>
              <input type="number" {...register("guestCount", { valueAsNumber: true })} className={InputClass} placeholder="e.g. 500" />
           </div>
         )}
      </div>

      <div>
         <label className={LabelClass}>Event Notes <span className="font-normal text-muted-foreground/50">(Optional)</span></label>
         <textarea {...register("eventNotes")} rows={3} className={InputClass} placeholder="Any special requirements, preferences, or important details…" />
      </div>

    </div>
  );
}


function Step3_PackageTeam({ formData, register, errors, setValue }: any) {

  const togglePhotographer = (id: string) => {
    const current = formData.assignedPhotographers || [];
    if (current.includes(id)) {
      setValue("assignedPhotographers", current.filter((x: string) => x !== id));
    } else {
      setValue("assignedPhotographers", [...current, id]);
    }
  };
  
  const selectedPkg = mockPackages.find(p => p.id === formData.packageId);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h3 className="text-xl font-medium tracking-wide mb-6 text-foreground">Package and team assignment</h3>
        
        {/* Packages Grid */}
        <label className={LabelClass}>Select Base Package *</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {mockPackages.map(pkg => (
            <div 
              key={pkg.id} 
              onClick={() => { setValue("packageId", pkg.id); setValue("addOns", []); setValue("customAmount", undefined); }}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden group ${formData.packageId === pkg.id ? 'bg-primary/5 border-primary' : 'bg-background border-border hover:border-muted-foreground/50'}`}
            >
              {pkg.popularity > 20 && (
                <div className="absolute top-0 right-0 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}
              {formData.packageId === pkg.id && (
                <div className="absolute top-4 right-4 h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground stroke-[3]" />
                </div>
              )}
              <h4 className="text-foreground font-bold tracking-wide">{pkg.name}</h4>
              <p className="text-xl font-bold text-primary mt-1 mb-3">₹{pkg.price.toLocaleString('en-IN')}</p>
              <ul className="text-[12px] text-muted-foreground flex flex-col gap-1.5">
                {pkg.inclusions.slice(0,4).map(inc => (
                  <li key={inc} className="flex items-start gap-1"><span className="text-primary">•</span> {inc}</li>
                ))}
                {pkg.inclusions.length > 4 && <li><span className="text-primary">•</span> + {pkg.inclusions.length - 4} more</li>}
              </ul>
            </div>
          ))}
        </div>
        {errors.packageId && <ErrorText>{errors.packageId.message as string}</ErrorText>}
      </div>

      {formData.packageId && selectedPkg && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
           <label className={LabelClass}>Price Config</label>
           <div className="bg-background p-4 rounded-xl border border-border mt-2 flex items-center gap-4">
              <span className="text-sm font-semibold tracking-wide flex-1 text-foreground">Use custom baseline package price?</span>
              <input type="number" {...register("customAmount", { valueAsNumber: true })} className={`${InputClass} !w-48 !py-1.5 font-mono`} placeholder={selectedPkg.price.toString()} />
           </div>

           {selectedPkg.addons.length > 0 && (
             <div className="mt-8">
               <label className={LabelClass}>Available Add-Ons</label>
               <div className="grid grid-cols-2 gap-3 mt-3">
                 {selectedPkg.addons.map(addon => (
                   <label key={addon.name} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${formData.addOns?.includes(addon.name) ? 'bg-primary/10 border-primary/30' : 'bg-background border-border'}`}>
                     <input 
                       type="checkbox" 
                       value={addon.name} 
                       {...register("addOns")}
                       className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-card"
                     />
                     <div className="flex flex-col">
                       <span className="text-sm font-bold text-foreground">{addon.name}</span>
                       <span className="text-[11px] font-mono text-primary">+₹{addon.price.toLocaleString('en-IN')}</span>
                     </div>
                   </label>
                 ))}
               </div>
             </div>
           )}
        </div>
      )}

      {/* Team Assignment */}
      <div className="bg-background rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <label className="block text-foreground font-semibold">Assign Team Hierarchy</label>
          <span className="text-[11px] text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-0.5 rounded-full flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Required</span>
        </div>

        {/* Photographers */}
        <div className="mb-6">
          <label className={LabelClass}>Photographers *</label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {mockTeam.filter(t => t.role === "Lead Photographer" || t.role === "Photographer").map(tm => {
              const isSelected = formData.assignedPhotographers?.includes(tm.id);
              // Mock conflict detection logic using mockBookings for selected event date
              const isConflict = formData.eventDate && mockBookings.some(b => b.date.startsWith(formData.eventDate) && b.teamAssignedIds.includes(tm.id));
              
              return (
                <div 
                  key={tm.id} 
                  onClick={() => !isConflict && togglePhotographer(tm.id)}
                  className={`p-3 rounded-xl border transition-colors flex items-center gap-3 ${isSelected ? 'bg-primary/10 border-primary shadow-inner shadow-primary/10' : isConflict ? 'opacity-40 cursor-not-allowed bg-muted grayscale border-border' : 'bg-card hover:border-primary/40 cursor-pointer border-border'}`}
                >
                  <Avatar className="h-10 w-10 ring-2 ring-card"><AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold border border-primary/20">{tm.avatarInitials}</AvatarFallback></Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-foreground truncate">{tm.name}</span>
                    <span className="text-[11px] text-muted-foreground truncate">{tm.role}</span>
                  </div>
                  {isConflict && <AlertCircle className="h-4 w-4 text-red-500 ml-auto shrink-0" />}
                </div>
              );
            })}
          </div>
          {errors.assignedPhotographers && <ErrorText>{errors.assignedPhotographers.message as string}</ErrorText>}
        </div>

        {/* Similar arrays can be mapped for Videographers / Editors */}
        <div className="text-sm text-yellow-600 dark:text-yellow-500/80 bg-yellow-500/10 p-3 rounded-lg flex items-center gap-2 mt-4 border border-yellow-500/20">
          <AlertCircle className="h-4 w-4" /> Conflict detection is active. Members booked on {formData.eventDate || 'this date'} are grayed out.
        </div>
      </div>
    </div>
  );
}


function Step4_PaymentNotes({ formData, register, errors, setValue }: any) {
  
  const balance = (formData.totalAmount || 0) - (formData.advanceAmount || 0);
  const pct = formData.totalAmount ? Math.min(100, Math.round(((formData.advanceAmount || 0) / formData.totalAmount) * 100)) : 0;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h3 className="text-xl font-medium text-foreground tracking-wide mb-6">Payment and confirmation</h3>
        
        {/* Payment Summary */}
        <div className="bg-background rounded-xl border border-border p-5 grid grid-cols-2 gap-8">
           <div>
              <label className="block text-foreground font-bold mb-2">Total Amount</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                <input type="number" {...register("totalAmount", { valueAsNumber: true })} className={`${InputClass} pl-10 font-bold text-lg text-foreground shadow-inner`} />
              </div>
              {errors.totalAmount && <ErrorText>{errors.totalAmount.message as string}</ErrorText>}
           </div>

           <div>
              <label className="block text-primary font-bold mb-2">Advance Settled</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-5 w-5 text-primary" />
                <input type="number" {...register("advanceAmount", { valueAsNumber: true })} className={`${InputClass} pl-10 font-bold tracking-wider text-lg text-primary border-primary/30 bg-primary/5 focus:border-primary focus:ring-primary/20`} placeholder="0" />
              </div>
              {errors.advanceAmount && <ErrorText>{errors.advanceAmount.message as string}</ErrorText>}

              <div className="mt-3 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Balance: ₹{balance.toLocaleString('en-IN')}</span>
                  <span>{pct}% paid</span>
                </div>
                <div className="h-1.5 w-full bg-card rounded-full overflow-hidden border border-border/50">
                  <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
         <div className="flex flex-col gap-5">
            <div>
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-background rounded-xl border border-border hover:border-primary/50 transition">
                <input type="checkbox" {...register("advancePaid")} className="h-5 w-5 rounded border-border text-primary ring-0 focus:ring-primary/30 transition bg-card" />
                <span className="text-foreground font-semibold">Advance Payment Received Verified</span>
              </label>
            </div>
            {formData.advancePaid && (
              <div className="animate-in slide-in-from-top-2">
                 <label className={LabelClass}>Payment Mode</label>
                 <select {...register("paymentMode")} className={InputClass}>
                   <option value="UPI">UPI</option>
                   <option value="Bank Transfer">Bank Transfer</option>
                   <option value="Cash">Cash</option>
                   <option value="Card">Card</option>
                   <option value="Cheque">Cheque</option>
                 </select>
              </div>
            )}
            <div>
              <label className={LabelClass}>Balance Due Date</label>
              <input type="date" {...register("balanceDueDate")} className={`${InputClass} custom-date-input uppercase font-mono tracking-wider text-sm`} />
            </div>
         </div>

         <div className="flex flex-col gap-4">
           {/* Booking Status Radio */}
           <label className={LabelClass}>Record Status</label>
           <div className="flex gap-2">
              {[
                { val: "Confirmed", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-500", dot: "bg-emerald-500" },
                { val: "Pending", bg: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-500", dot: "bg-amber-500" },
                { val: "Inquiry", bg: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-500", dot: "bg-blue-500" },
              ].map(st => (
                <button
                  key={st.val}
                  type="button"
                  onClick={() => setValue("status", st.val)}
                  className={`flex-1 py-3 rounded-lg border flex flex-col items-center gap-1.5 transition ${formData.status === st.val ? st.bg + ' shadow-inner shadow-black/5 dark:shadow-black/20' : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/50'}`}
                >
                  <div className={`h-2.5 w-2.5 rounded-full ${formData.status === st.val ? st.dot : 'bg-transparent border border-muted-foreground'}`} />
                  <span className="text-[12px] font-bold">{st.val}</span>
                </button>
              ))}
           </div>
           
           <div className="mt-4">
             <label className={LabelClass}>Internal Notes / Logistics <span className="font-normal text-muted-foreground/50">(Staff only)</span></label>
             <textarea {...register("internalNotes")} rows={3} className={InputClass} placeholder="Logistics reminders, handling instructions..." />
           </div>
         </div>
      </div>

    </div>
  );
}
