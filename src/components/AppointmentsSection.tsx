import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar, Clock, Trash2, MapPin, Plus, CheckCircle, XCircle, CalendarClock, ChevronDown, ChevronRight, CalendarCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Appointment {
  id: string;
  title: string;
  description?: string;
  appointment_date: string;
  duration: number;
  status: string;
  appointment_type?: string;
  completion_notes?: string;
}

interface AppointmentsSectionProps {
  leadId: string;
  leadName?: string;
}

export const AppointmentsSection = ({ leadId, leadName }: AppointmentsSectionProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [upcomingOpen, setUpcomingOpen] = useState(true);
  const [pastOpen, setPastOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "", description: "", appointmentDate: "", appointmentTime: "09:00", duration: "60", appointmentType: "property_showing",
    showingAddress: "", multipleProperties: false,
  });

  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ appointmentDate: "", appointmentTime: "09:00" });
  const [completionNotes, setCompletionNotes] = useState("");

  useEffect(() => { fetchAppointments(); }, [leadId]);

  useEffect(() => {
    if (!leadId) return;
    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments', filter: `lead_id=eq.${leadId}` }, () => fetchAppointments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [leadId]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase.from("appointments").select("*").eq("lead_id", leadId).order("appointment_date", { ascending: true });
      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase.from("appointments").delete().eq("id", appointmentId);
      if (error) throw error;
      fetchAppointments();
      toast({ title: "Appointment deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const isUpcoming = (date: string) => new Date(date) > new Date();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const appointmentDateTime = new Date(`${formData.appointmentDate}T${formData.appointmentTime}`);
      // Build description with showing details if applicable
      let fullDescription = formData.description || "";
      if (formData.appointmentType === "property_showing" && formData.showingAddress) {
        fullDescription = `📍 Showing Address: ${formData.showingAddress}${formData.multipleProperties ? "\n🏠 Multiple properties showing" : ""}${fullDescription ? `\n\n${fullDescription}` : ""}`;
      }
      const { error } = await supabase.from("appointments").insert({
        title: formData.title, description: fullDescription || null, lead_id: leadId, user_id: user.id, created_by_user_id: user.id,
        appointment_date: appointmentDateTime.toISOString(), duration: parseInt(formData.duration), appointment_type: formData.appointmentType, status: "pending",
      });
      if (error) throw error;
      toast({ title: "Appointment scheduled" });
      setFormData({ title: "", description: "", appointmentDate: "", appointmentTime: "09:00", duration: "60", appointmentType: "property_showing", showingAddress: "", multipleProperties: false });
      setIsDialogOpen(false);
      fetchAppointments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleMarkNoShow = async (appointmentId: string) => {
    try {
      const { error } = await supabase.from("appointments").update({ status: "no_show" }).eq("id", appointmentId);
      if (error) throw error;
      fetchAppointments();
      toast({ title: "Marked as no show" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    setLoading(true);
    try {
      const dt = new Date(`${rescheduleData.appointmentDate}T${rescheduleData.appointmentTime}`);
      const { error } = await supabase.from("appointments").update({ appointment_date: dt.toISOString(), status: "rescheduled" }).eq("id", selectedAppointment.id);
      if (error) throw error;
      toast({ title: "Appointment rescheduled" });
      setRescheduleDialogOpen(false); setSelectedAppointment(null); setRescheduleData({ appointmentDate: "", appointmentTime: "09:00" });
      fetchAppointments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleComplete = async () => {
    if (!selectedAppointment) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("appointments").update({ status: "completed", completion_notes: completionNotes }).eq("id", selectedAppointment.id);
      if (error) throw error;
      toast({ title: "Appointment completed" });
      setCompleteDialogOpen(false); setSelectedAppointment(null); setCompletionNotes("");
      fetchAppointments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const openRescheduleDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    const date = new Date(appointment.appointment_date);
    setRescheduleData({ appointmentDate: date.toISOString().split('T')[0], appointmentTime: date.toTimeString().slice(0, 5) });
    setRescheduleDialogOpen(true);
  };

  const openCompleteDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCompletionNotes(appointment.completion_notes || "");
    setCompleteDialogOpen(true);
  };

  const getTypeLabel = (type?: string) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      property_showing: "Property Showing", first_time_consult: "First Time Consult",
      negotiating_numbers: "Negotiating Numbers", follow_up_consult: "Follow Up Consult",
      sellers_consult: "Sellers Consult", listing_consult: "Listing Consult",
      property_viewing: "Viewing", consultation: "Consult", follow_up: "Follow Up",
      closing: "Closing", other: "Other",
    };
    return labels[type] || type;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "completed": return { label: "Completed", bg: "bg-success/10 text-success border-success/20", border: "border-l-success" };
      case "cancelled": return { label: "Cancelled", bg: "bg-destructive/10 text-destructive border-destructive/20", border: "border-l-destructive" };
      case "no_show": return { label: "No Show", bg: "bg-warning/10 text-warning border-warning/20", border: "border-l-warning" };
      case "rescheduled": return { label: "Rescheduled", bg: "bg-info/10 text-info border-info/20", border: "border-l-info" };
      default: return { label: "Pending", bg: "bg-primary/10 text-primary border-primary/20", border: "border-l-primary" };
    }
  };

  const upcomingAppointments = appointments.filter(a => isUpcoming(a.appointment_date) || a.status === "pending");
  const pastAppointments = appointments.filter(a => !isUpcoming(a.appointment_date) && a.status !== "pending");

  const SectionHeader = ({ icon: Icon, label, count, color, isOpen, onToggle }: { icon: any; label: string; count: number; color: string; isOpen: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="flex items-center gap-2 w-full py-2 px-1 text-left">
      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</span>
      <Badge variant="secondary" className={`text-[10px] h-4 px-1.5 ml-auto ${count === 0 ? 'opacity-50' : ''}`}>{count}</Badge>
    </button>
  );

  const renderAppointment = (appointment: Appointment) => {
    const date = new Date(appointment.appointment_date);
    const isPending = appointment.status === "pending";
    const config = getStatusConfig(appointment.status);

    return (
      <div key={appointment.id} className={`group relative pl-4 pr-3 py-3 rounded-lg border bg-card transition-all hover:shadow-sm border-l-[3px] ${config.border}`}>
        {/* Top: Title + Status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug text-foreground">{appointment.title}</p>
            {appointment.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{appointment.description}</p>
            )}
          </div>
          <Badge className={`text-[10px] h-5 shrink-0 ${config.bg}`}>{config.label}</Badge>
        </div>

        {/* Meta pills */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            <Clock className="h-3 w-3" />
            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            <Clock className="h-3 w-3" />
            {appointment.duration} min
          </span>
          {appointment.appointment_type && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {getTypeLabel(appointment.appointment_type)}
            </span>
          )}
        </div>

        {/* Completion notes */}
        {appointment.completion_notes && appointment.status === "completed" && (
          <div className="text-[11px] text-muted-foreground bg-success/5 border border-success/10 rounded-md p-2 mb-2 line-clamp-2">
            📝 {appointment.completion_notes}
          </div>
        )}

        {/* Actions for pending */}
        {isPending && (
          <div className="flex items-center gap-1 pt-2 border-t border-border/40">
            <Button variant="outline" size="sm" onClick={() => openCompleteDialog(appointment)} className="h-7 text-xs flex-1 gap-1 border-success/30 text-success hover:bg-success/10 hover:text-success">
              <CheckCircle className="h-3 w-3" /> Complete
            </Button>
            <Button variant="outline" size="sm" onClick={() => openRescheduleDialog(appointment)} className="h-7 text-xs flex-1 gap-1 border-info/30 text-info hover:bg-info/10 hover:text-info">
              <CalendarClock className="h-3 w-3" /> Reschedule
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleMarkNoShow(appointment.id)} className="h-7 text-xs flex-1 gap-1 border-warning/30 text-warning hover:bg-warning/10 hover:text-warning">
              <XCircle className="h-3 w-3" /> No Show
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDeleteAppointment(appointment.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Delete for non-pending */}
        {!isPending && (
          <div className="flex justify-end">
            <Button variant="ghost" size="icon" onClick={() => handleDeleteAppointment(appointment.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Appointments</h3>
              <p className="text-[11px] text-muted-foreground">
                {upcomingAppointments.length} upcoming · {pastAppointments.length} past
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" /> Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Schedule Appointment</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Property viewing" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Meeting notes..." className="resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointmentDate">Date</Label>
                    <Input id="appointmentDate" type="date" value={formData.appointmentDate} onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="appointmentTime">Time</Label>
                    <Input id="appointmentTime" type="time" value={formData.appointmentTime} onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={formData.duration} onValueChange={(v) => setFormData({ ...formData, duration: v })}>
                      <SelectTrigger id="duration"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="space-y-2">
                     <Label htmlFor="appointmentType">Type</Label>
                     <Select value={formData.appointmentType} onValueChange={(v) => setFormData({ ...formData, appointmentType: v, showingAddress: "", multipleProperties: false })}>
                       <SelectTrigger id="appointmentType"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="property_showing">Property Showing</SelectItem>
                         <SelectItem value="first_time_consult">First Time Consult</SelectItem>
                         <SelectItem value="negotiating_numbers">Negotiating Numbers</SelectItem>
                         <SelectItem value="follow_up_consult">Follow Up Consult</SelectItem>
                         <SelectItem value="sellers_consult">Sellers Consult</SelectItem>
                         <SelectItem value="listing_consult">Listing Consult</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                 {formData.appointmentType === "property_showing" && (
                   <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                     <div className="space-y-2">
                       <Label htmlFor="showingAddress">Address of Property Showing</Label>
                       <Input id="showingAddress" value={formData.showingAddress} onChange={(e) => setFormData({ ...formData, showingAddress: e.target.value })} placeholder="Enter property address" />
                     </div>
                     <div className="flex items-center gap-2">
                       <Button
                         type="button"
                         variant={formData.multipleProperties ? "default" : "outline"}
                         size="sm"
                         className="text-xs gap-1.5"
                         onClick={() => setFormData({ ...formData, multipleProperties: !formData.multipleProperties })}
                       >
                         <MapPin className="h-3.5 w-3.5" />
                         {formData.multipleProperties ? "Showing Multiple Properties ✓" : "Showing Multiple Properties?"}
                       </Button>
                     </div>
                   </div>
                 )}
                 <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Appointment"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Appointment Groups */}
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <CalendarCheck className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">No appointments</p>
              <p className="text-xs text-muted-foreground mt-0.5">Schedule your first appointment above</p>
            </div>
          ) : (
            <>
              <Collapsible open={upcomingOpen} onOpenChange={setUpcomingOpen}>
                <CollapsibleTrigger asChild>
                  <div>
                    <SectionHeader icon={CalendarClock} label="Upcoming" count={upcomingAppointments.length} color="text-primary" isOpen={upcomingOpen} onToggle={() => setUpcomingOpen(!upcomingOpen)} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pb-3 pl-1">
                    {upcomingAppointments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No upcoming appointments</p>
                    ) : (
                      upcomingAppointments.map(renderAppointment)
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={pastOpen} onOpenChange={setPastOpen}>
                <CollapsibleTrigger asChild>
                  <div>
                    <SectionHeader icon={CalendarCheck} label="Past" count={pastAppointments.length} color="text-muted-foreground" isOpen={pastOpen} onToggle={() => setPastOpen(!pastOpen)} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 pb-3 pl-1">
                    {pastAppointments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3 text-center">No past appointments</p>
                    ) : (
                      pastAppointments.map(renderAppointment)
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>Choose a new date and time</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">Date</Label>
              <Input id="reschedule-date" type="date" value={rescheduleData.appointmentDate} onChange={(e) => setRescheduleData({ ...rescheduleData, appointmentDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule-time">Time</Label>
              <Input id="reschedule-time" type="time" value={rescheduleData.appointmentTime} onChange={(e) => setRescheduleData({ ...rescheduleData, appointmentTime: e.target.value })} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={loading}>{loading ? "Rescheduling..." : "Reschedule"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Appointment</DialogTitle>
            <DialogDescription>Add notes about this appointment</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="completion-notes">Notes</Label>
            <Textarea id="completion-notes" value={completionNotes} onChange={(e) => setCompletionNotes(e.target.value)} placeholder="What information was collected? Any follow-up needed?" className="resize-none" rows={5} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={loading}>{loading ? "Marking..." : "Mark Complete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
