import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Phone, PlusCircle, History, ChevronDown, ChevronRight, StickyNote, Clock, Send, Pencil, Check, X, Trophy } from "lucide-react";
import { CallHistory } from "@/components/CallHistory";
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
  handleUpdateNote?: (noteId: string, newContent: string) => void;
}

export const ActivitySection = ({ leadId, notes, newNote, setNewNote, handleAddNote, handleUpdateNote }: ActivitySectionProps) => {
  const [modificationHistory, setModificationHistory] = useState<{ modifier: string; timestamp: string } | null>(null);
  const [callHistoryOpen, setCallHistoryOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

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

  const SectionHeader = ({ icon: Icon, label, count, color, isOpen, onToggle }: { icon: any; label: string; count?: number; color: string; isOpen: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 w-full py-2 px-1 text-left group/header"
    >
      {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{label}</span>
      {count !== undefined && (
        <Badge variant="secondary" className={`text-[10px] h-4 px-1.5 ml-auto ${count === 0 ? 'opacity-50' : ''}`}>
          {count}
        </Badge>
      )}
    </button>
  );

  return (
    <Card className="border overflow-hidden">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <History className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Activity & History</h3>
              {modificationHistory && (
                <p className="text-[11px] text-muted-foreground">
                  Last modified by <span className="font-medium text-foreground">{modificationHistory.modifier}</span> · {modificationHistory.timestamp}
                </p>
              )}
            </div>
          </div>
          <Button
            variant={isAddingNote ? "secondary" : "default"}
            size="sm"
            onClick={() => setIsAddingNote(!isAddingNote)}
            className="h-8 text-xs gap-1"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            New Note
          </Button>
        </div>

        {/* Add Note Form */}
        {isAddingNote && (
          <div className="mb-4 p-4 bg-muted/30 rounded-xl border border-dashed border-primary/20 space-y-3">
            <Textarea
              placeholder="Write a note..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-sm min-h-[80px] resize-none bg-background"
              autoFocus
            />
            <div className="flex gap-2 pt-1">
              <Button onClick={() => { handleAddNote(); setIsAddingNote(false); }} disabled={!newNote.trim()} size="sm" className="h-8 text-xs flex-1 gap-1">
                <Send className="h-3 w-3" /> Add Note
              </Button>
              <Button onClick={() => setIsAddingNote(false)} variant="outline" size="sm" className="h-8 text-xs">Cancel</Button>
            </div>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {/* Notes Section */}
          <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
            <CollapsibleTrigger asChild>
              <div>
                <SectionHeader icon={StickyNote} label="Notes" count={notes.length} color="text-primary" isOpen={notesOpen} onToggle={() => setNotesOpen(!notesOpen)} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 pb-3 pl-1">
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3 text-center">No notes yet</p>
                ) : (
                  notes.map((note) => {
                    const isDealClosed = note.content?.startsWith("🏆 Transaction Closed");
                    return (
                    <div
                      key={note.id}
                      className={`group relative pl-4 pr-3 py-3 rounded-lg border bg-card transition-all hover:shadow-sm border-l-[3px] ${isDealClosed ? 'border-l-green-500 bg-green-500/5' : 'border-l-primary'}`}
                    >
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="min-h-[60px] text-sm resize-none"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={!editingContent.trim()}
                              onClick={() => {
                                handleUpdateNote?.(note.id, editingContent);
                                setEditingNoteId(null);
                              }}
                            >
                              <Check className="h-3 w-3" /> Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1"
                              onClick={() => setEditingNoteId(null)}
                            >
                              <X className="h-3 w-3" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {isDealClosed && (
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Trophy className="h-3.5 w-3.5 text-green-600" />
                              <span className="text-xs font-semibold text-green-700 dark:text-green-400">Transaction Closed</span>
                            </div>
                          )}
                          <p
                            className={`text-sm leading-snug cursor-pointer hover:text-primary transition-colors whitespace-pre-line ${isDealClosed ? 'text-foreground' : 'text-foreground'}`}
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditingContent(note.content);
                            }}
                            title="Click to edit"
                          >
                            {isDealClosed ? note.content.replace(/^🏆 Transaction Closed — /, '') : note.content}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {note.timestamp}
                            </span>
                            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                              {note.author}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingContent(note.content);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );})

                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Call History Section */}
          <Collapsible open={callHistoryOpen} onOpenChange={setCallHistoryOpen}>
            <CollapsibleTrigger asChild>
              <div>
                <SectionHeader icon={Phone} label="Call History" color="text-success" isOpen={callHistoryOpen} onToggle={() => setCallHistoryOpen(!callHistoryOpen)} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pb-3 pl-1">
                <CallHistory leadId={leadId} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Card>
  );
};
