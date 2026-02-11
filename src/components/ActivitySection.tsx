import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Phone, PlusCircle, History } from "lucide-react";
import { CallHistory } from "@/components/CallHistory";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

interface ActivitySectionProps {
  leadId: string;
  notes: Note[];
  newNote: string;
  setNewNote: (value: string) => void;
  handleAddNote: () => void;
}

export const ActivitySection = ({ leadId, notes, newNote, setNewNote, handleAddNote }: ActivitySectionProps) => {
  const [modificationHistory, setModificationHistory] = useState<{ modifier: string; timestamp: string } | null>(null);

  useEffect(() => {
    const fetchModificationHistory = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("updated_at, last_modified_by")
        .eq("id", leadId)
        .maybeSingle();

      if (data && data.last_modified_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", data.last_modified_by)
          .maybeSingle();

        const modifierName = profile 
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || "Unknown User"
          : "Unknown User";
        
        setModificationHistory({
          modifier: modifierName,
          timestamp: formatDistanceToNow(new Date(data.updated_at), { addSuffix: true }),
        });
      }
    };

    fetchModificationHistory();
  }, [leadId]);

  return (
    <Card className="border">
      <CardHeader className="p-4">
        <CardTitle className="text-lg font-semibold">Activity & History</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {/* Modification History Section */}
            {modificationHistory && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Last Modified</h3>
                  </div>
                  <Card className="p-3 text-sm bg-muted/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{modificationHistory.modifier}</span>
                      <span className="text-muted-foreground">{modificationHistory.timestamp}</span>
                    </div>
                  </Card>
                </div>
                <Separator className="my-4" />
              </>
            )}

            {/* Call History Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Call History</h3>
              </div>
              <CallHistory leadId={leadId} />
            </div>

            <Separator className="my-4" />

            {/* Notes Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <PlusCircle className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Notes</h3>
              </div>
              <div className="space-y-3 mb-4">
                {notes.map((note) => (
                  <Card key={note.id} className="p-3 text-sm">
                    <p className="mb-2">{note.content}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{note.author}</span>
                      <span>{note.timestamp}</span>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim()} className="w-full h-9 text-sm">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
