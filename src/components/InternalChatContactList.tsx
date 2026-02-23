import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Contact {
  user_id: string;
  name: string;
  conversationId?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
}

interface InternalChatContactListProps {
  onSelectContact: (contact: Contact) => void;
}

export function InternalChatContactList({ onSelectContact }: InternalChatContactListProps) {
  const { session } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;
    loadContacts();
  }, [session?.user?.id]);

  const loadContacts = async () => {
    if (!session?.user) return;
    setLoading(true);

    try {
      // Get current user's org
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (!profile?.organization_id) { setLoading(false); return; }

      // Get all supreme_admin users in same org (except self)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["supreme_admin", "admin"]);

      const { data: orgProfiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name, email")
        .eq("organization_id", profile.organization_id)
        .neq("user_id", session.user.id);

      if (!roles || !orgProfiles) { setLoading(false); return; }

      const adminUserIds = new Set(roles.map((r) => r.user_id));
      const adminContacts = orgProfiles.filter((p) => adminUserIds.has(p.user_id));

      // Get existing conversations for this user
      const { data: myParticipations } = await supabase
        .from("internal_conversation_participants" as any)
        .select("conversation_id")
        .eq("user_id", session.user.id);

      const myConvIds = (myParticipations || []).map((p: any) => p.conversation_id);

      // Build contact list with conversation info
      const contactList: Contact[] = [];

      for (const admin of adminContacts) {
        const name = [admin.first_name, admin.last_name].filter(Boolean).join(" ") || admin.email || "Unknown";
        let conversationId: string | undefined;
        let lastMessage: string | undefined;
        let lastMessageAt: string | undefined;
        let unreadCount = 0;

        if (myConvIds.length > 0) {
          // Find shared conversation
          const { data: theirParticipations } = await supabase
            .from("internal_conversation_participants" as any)
            .select("conversation_id")
            .eq("user_id", admin.user_id)
            .in("conversation_id", myConvIds);

          if (theirParticipations && theirParticipations.length > 0) {
            conversationId = (theirParticipations[0] as any).conversation_id;

            // Get last message
            const { data: lastMsg } = await supabase
              .from("internal_messages" as any)
              .select("content, created_at")
              .eq("conversation_id", conversationId)
              .order("created_at", { ascending: false })
              .limit(1);

            if (lastMsg && lastMsg.length > 0) {
              lastMessage = (lastMsg[0] as any).content;
              lastMessageAt = (lastMsg[0] as any).created_at;
            }

            // Count unread
            const { count } = await supabase
              .from("internal_messages" as any)
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conversationId)
              .neq("sender_id", session.user.id)
              .is("read_at", null);

            unreadCount = count || 0;
          }
        }

        contactList.push({ user_id: admin.user_id, name, conversationId, lastMessage, lastMessageAt, unreadCount });
      }

      // Sort: contacts with unread first, then by last message time
      contactList.sort((a, b) => {
        if (a.unreadCount && !b.unreadCount) return -1;
        if (!a.unreadCount && b.unreadCount) return 1;
        if (a.lastMessageAt && b.lastMessageAt) return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        if (a.lastMessageAt) return -1;
        return 1;
      });

      setContacts(contactList);
    } catch (err) {
      console.error("Error loading chat contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b bg-muted/30">
        <h3 className="font-semibold text-sm">Internal Chat</h3>
        <p className="text-xs text-muted-foreground">Message other admins</p>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : contacts.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No other admins found</div>
        ) : (
          contacts.map((contact) => (
            <button
              key={contact.user_id}
              onClick={() => onSelectContact(contact)}
              className="w-full text-left p-3 hover:bg-muted/50 transition-colors border-b border-border/50 flex items-center gap-3"
            >
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{contact.name}</span>
                  {contact.unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                      {contact.unreadCount}
                    </span>
                  )}
                </div>
                {contact.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {contact.lastMessage}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
