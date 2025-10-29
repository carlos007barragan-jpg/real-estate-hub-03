import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Building2, DollarSign, Calendar, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: string;
  content: string;
  author: string;
  created_at: string;
  note_type: string;
}

interface Deal {
  id: string;
  client: string;
  agent: string;
  commission: number;
  closeDate: string;
  priority: "high" | "medium" | "low";
  leadId?: string;
}

interface DealNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal | null;
}

const priorityColors = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-warning-foreground",
  low: "bg-muted text-muted-foreground",
};

export function DealNotesDialog({ open, onOpenChange, deal }: DealNotesDialogProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && deal?.leadId) {
      fetchNotes();
    }
  }, [open, deal?.leadId]);

  const fetchNotes = async () => {
    if (!deal?.leadId) return;

    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("lead_id", deal.leadId)
        .eq("note_type", "pipeline")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      console.error("Error fetching notes:", error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !deal?.leadId) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("notes").insert({
        lead_id: deal.leadId,
        user_id: userData.user.id,
        content: newNote,
        author: "Pipeline Agent",
        note_type: "pipeline",
      });

      if (error) throw error;

      toast({
        title: "Note added",
        description: "Pipeline note has been saved successfully",
      });

      setNewNote("");
      await fetchNotes();
    } catch (error: any) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!deal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Deal Details
          </DialogTitle>
          <DialogDescription>
            View and manage pipeline notes for this deal
          </DialogDescription>
        </DialogHeader>

        {/* Deal Summary */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg">{deal.client}</h3>
            <Badge className={priorityColors[deal.priority]} variant="secondary">
              {deal.priority}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4 flex-shrink-0" />
              <span>Agent: {deal.agent}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <DollarSign className="h-4 w-4 flex-shrink-0" />
              <span>${deal.commission.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>{deal.closeDate}</span>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          <h4 className="font-semibold text-sm">Pipeline Notes</h4>
          
          <ScrollArea className="flex-1 rounded-lg border p-3">
            {notes.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                No pipeline notes yet. Add one below.
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-muted/50 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {note.author}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Add Note */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a pipeline note about this deal..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim() || loading}
              className="w-full"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Pipeline Note
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
