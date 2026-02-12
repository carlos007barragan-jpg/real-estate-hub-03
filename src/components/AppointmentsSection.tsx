import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trash2, MapPin, Plus, CheckCircle, XCircle, CalendarClock } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    appointmentDate: "",
    appointmentTime: "09:00",
    duration: "60",
    appointmentType: "property_viewing",
  });

  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleData, setRescheduleData] = useState({
    appointmentDate: "",
    appointmentTime: "09:00",
  });
  const [completionNotes, setCompletionNotes] = useState("");

  useEffect(() => {
    fetchAppointments();
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments', filter: `lead_id=eq.${leadId}` },
        () => fetchAppointments()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leadId]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("lead_id", leadId)
        .order("appointment_date", { ascending: true });

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

      const { error } = await supabase.from("appointments").insert({
        title: formData.title,
        description: formData.description || null,
        lead_id: leadId,
        user_id: user.id,
        created_by_user_id: user.id,
        appointment_date: appointmentDateTime.toISOString(),
        duration: parseInt(formData.duration),
        appointment_type: formData.appointmentType,
        status: "pending",
      });

      if (error) throw error;
      toast({ title: "Appointment scheduled", description: "Appointment has been created successfully" });
      setFormData({ title: "", description: "", appointmentDate: "", appointmentTime: "09:00", duration: "60", appointmentType: "property_viewing" });
      setIsDialogOpen(false);
      fetchAppointments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
      const appointmentDateTime = new Date(`${rescheduleData.appointmentDate}T${rescheduleData.appointmentTime}`);
      const { error } = await supabase
        .from("appointments")
        .update({ appointment_date: appointmentDateTime.toISOString(), status: "rescheduled" })
        .eq("id", selectedAppointment.id);

      if (error) throw error;
      toast({ title: "Appointment rescheduled" });
      setRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      setRescheduleData({ appointmentDate: "", appointmentTime: "09:00" });
      fetchAppointments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedAppointment) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "completed", completion_notes: completionNotes })
        .eq("id", selectedAppointment.id);

      if (error) throw error;
      toast({ title: "Appointment completed" });
      setCompleteDialogOpen(false);
      setSelectedAppointment(null);
      setCompletionNotes("");
      fetchAppointments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openRescheduleDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    const date = new Date(appointment.appointment_date);
    setRescheduleData({
      appointmentDate: date.toISOString().split('T')[0],
      appointmentTime: date.toTimeString().slice(0, 5),
    });
    setRescheduleDialogOpen(true);
  };

  const openCompleteDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCompletionNotes(appointment.completion_notes || "");
    setCompleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/15 text-success border-success/20 text-[10px] h-5">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/15 text-destructive border-destructive/20 text-[10px] h-5">Cancelled</Badge>;
      case "no_show":
        return <Badge className="bg-warning/15 text-warning border-warning/20 text-[10px] h-5">No Show</Badge>;
      case "rescheduled":
        return <Badge className="bg-info/15 text-info border-info/20 text-[10px] h-5">Rescheduled</Badge>;
      default:
        return <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] h-5">Pending</Badge>;
    }
  };

  const getTypeLabel = (type?: string) => {
    if (!type) return null;
    const labels: Record<string, string> = {
      property_viewing: "Viewing",
      consultation: "Consult",
      follow_up: "Follow Up",
      closing: "Closing",
      other: "Other",
    };
    return labels[type] || type;
  };

  const upcomingAppointments = appointments.filter(a => isUpcoming(a.appointment_date) || a.status === "pending");
  const pastAppointments = appointments.filter(a => !isUpcoming(a.appointment_date) && a.status !== "pending");
  const filteredAppointments = activeTab === "upcoming" ? upcomingAppointments : pastAppointments;

  return (
    <Card className="border">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Appointments</h3>
            {upcomingAppointments.length > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {upcomingAppointments.length} upcoming
              </Badge>
            )}
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Property viewing"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Meeting notes..."
                    className="resize-none"
                  />
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
                    <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
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
                    <Select value={formData.appointmentType} onValueChange={(value) => setFormData({ ...formData, appointmentType: value })}>
                      <SelectTrigger id="appointmentType"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="property_viewing">Property Viewing</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="closing">Closing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Appointment"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3 p-0.5 bg-muted/50 rounded-md">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 text-xs py-1.5 px-3 rounded transition-colors font-medium ${
              activeTab === "upcoming" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upcoming ({upcomingAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`flex-1 text-xs py-1.5 px-3 rounded transition-colors font-medium ${
              activeTab === "past" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Past ({pastAppointments.length})
          </button>
        </div>

        {/* Appointment List */}
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {filteredAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Calendar className="h-7 w-7 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">
                {activeTab === "upcoming" ? "No upcoming appointments" : "No past appointments"}
              </p>
            </div>
          ) : (
            filteredAppointments.map((appointment) => {
              const date = new Date(appointment.appointment_date);
              const isPending = appointment.status === "pending";

              return (
                <div
                  key={appointment.id}
                  className={`group p-3 rounded-lg border transition-all ${
                    isPending ? "bg-card hover:border-primary/30" : "bg-muted/20 border-border/50"
                  }`}
                >
                  {/* Top row: title + status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{appointment.title}</p>
                      {appointment.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{appointment.description}</p>
                      )}
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {appointment.duration} min
                    </span>
                    {appointment.appointment_type && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getTypeLabel(appointment.appointment_type)}
                      </span>
                    )}
                  </div>

                  {/* Completion notes */}
                  {appointment.completion_notes && appointment.status === "completed" && (
                    <p className="text-[11px] text-muted-foreground bg-muted/30 rounded p-1.5 mb-2 line-clamp-2">
                      📝 {appointment.completion_notes}
                    </p>
                  )}

                  {/* Action buttons — only for pending */}
                  {isPending && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCompleteDialog(appointment)}
                        className="h-7 text-xs text-success hover:text-success hover:bg-success/10 flex-1"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Complete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRescheduleDialog(appointment)}
                        className="h-7 text-xs text-info hover:text-info hover:bg-info/10 flex-1"
                      >
                        <CalendarClock className="h-3.5 w-3.5 mr-1" />
                        Reschedule
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkNoShow(appointment.id)}
                        className="h-7 text-xs text-warning hover:text-warning hover:bg-warning/10 flex-1"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        No Show
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAppointment(appointment.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Delete for non-pending */}
                  {!isPending && (
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAppointment(appointment.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>Choose a new date and time for this appointment</DialogDescription>
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
            <DialogDescription>Add any notes about information collected during this appointment</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="completion-notes">Notes</Label>
            <Textarea
              id="completion-notes"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="What information was collected? Any follow-up needed?"
              className="resize-none"
              rows={5}
            />
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
