import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Trash2, MapPin, Plus, CheckCircle, XCircle, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    appointmentDate: "",
    appointmentTime: "09:00",
    duration: "60",
    appointmentType: "property_viewing",
  });

  // Action dialogs
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

  // Real-time subscription for new appointments
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `lead_id=eq.${leadId}`
        },
        () => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentId);

      if (error) throw error;

      fetchAppointments();
      toast({
        title: "Appointment deleted",
      });
    } catch (error: any) {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success/10 text-success-foreground border-success/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive-foreground border-destructive/20";
      default:
        return "bg-info/10 text-info-foreground border-info/20";
    }
  };

  const isUpcoming = (date: string) => {
    return new Date(date) > new Date();
  };

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

      toast({
        title: "Appointment scheduled",
        description: "Appointment has been created successfully",
      });

      setFormData({
        title: "",
        description: "",
        appointmentDate: "",
        appointmentTime: "09:00",
        duration: "60",
        appointmentType: "property_viewing",
      });
      setIsDialogOpen(false);
      fetchAppointments();
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNoShow = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "no_show" })
        .eq("id", appointmentId);

      if (error) throw error;

      fetchAppointments();
      toast({
        title: "Marked as no show",
      });
    } catch (error: any) {
      console.error("Error updating appointment:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointment) return;
    setLoading(true);

    try {
      const appointmentDateTime = new Date(`${rescheduleData.appointmentDate}T${rescheduleData.appointmentTime}`);

      const { error } = await supabase
        .from("appointments")
        .update({ 
          appointment_date: appointmentDateTime.toISOString(),
          status: "rescheduled"
        })
        .eq("id", selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment rescheduled",
        description: "The appointment has been rescheduled successfully",
      });

      setRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      setRescheduleData({ appointmentDate: "", appointmentTime: "09:00" });
      fetchAppointments();
    } catch (error: any) {
      console.error("Error rescheduling appointment:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
        .update({ 
          status: "completed",
          completion_notes: completionNotes
        })
        .eq("id", selectedAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment completed",
        description: "The appointment has been marked as completed",
      });

      setCompleteDialogOpen(false);
      setSelectedAppointment(null);
      setCompletionNotes("");
      fetchAppointments();
    } catch (error: any) {
      console.error("Error completing appointment:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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

  return (
    <Card className="border">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointments
          </h3>
          
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
                    <Input
                      id="appointmentDate"
                      type="date"
                      value={formData.appointmentDate}
                      onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appointmentTime">Time</Label>
                    <Input
                      id="appointmentTime"
                      type="time"
                      value={formData.appointmentTime}
                      onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={formData.duration} onValueChange={(value) => setFormData({ ...formData, duration: value })}>
                      <SelectTrigger id="duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="appointmentType">Type</Label>
                    <Select value={formData.appointmentType} onValueChange={(value) => setFormData({ ...formData, appointmentType: value })}>
                      <SelectTrigger id="appointmentType">
                        <SelectValue />
                      </SelectTrigger>
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Appointment"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <ScrollArea className="h-[180px]">
          <div className="space-y-2">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No appointments scheduled</p>
              </div>
            ) : (
              appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{appointment.title}</p>
                      {appointment.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {appointment.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {appointment.status === "pending" ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              Pending
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openCompleteDialog(appointment)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMarkNoShow(appointment.id)}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Mark No Show
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRescheduleDialog(appointment)}>
                              <CalendarClock className="h-4 w-4 mr-2" />
                              Reschedule
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Badge variant="secondary" className={getStatusColor(appointment.status)}>
                          {appointment.status.replace('_', ' ')}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAppointment(appointment.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(appointment.appointment_date).toLocaleDateString()} at{" "}
                        {new Date(appointment.appointment_date).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isUpcoming(appointment.appointment_date) && (
                        <Badge variant="outline" className="ml-2 text-[10px] h-4 px-1">
                          Upcoming
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{appointment.duration} minutes</span>
                    </div>

                    {appointment.appointment_type && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="capitalize">{appointment.appointment_type}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Choose a new date and time for this appointment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reschedule-date">Date</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleData.appointmentDate}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, appointmentDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reschedule-time">Time</Label>
                <Input
                  id="reschedule-time"
                  type="time"
                  value={rescheduleData.appointmentTime}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, appointmentTime: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} disabled={loading}>
              {loading ? "Rescheduling..." : "Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Appointment</DialogTitle>
            <DialogDescription>
              Add any notes about information collected during this appointment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={loading}>
              {loading ? "Marking..." : "Mark Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
