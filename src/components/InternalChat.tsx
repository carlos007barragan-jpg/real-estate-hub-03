import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { InternalChatContactList } from "./InternalChatContactList";
import { InternalChatThread } from "./InternalChatThread";
import { Badge } from "@/components/ui/badge";

type ChatView = "closed" | "contacts" | "thread";

interface SelectedContact {
  user_id: string;
  name: string;
  conversationId?: string;
}

export function InternalChat() {
  const { role, session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<ChatView>("closed");
  const [selectedContact, setSelectedContact] = useState<SelectedContact | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const isAllowed = role === "supreme_admin" || role === "admin";

  // Check URL for ?chat= param to auto-open
  useEffect(() => {
    if (!isAllowed) return;
    const chatId = searchParams.get("chat");
    if (chatId && session?.user) {
      setActiveConversationId(chatId);
      setSelectedContact({ user_id: "", name: "Chat", conversationId: chatId });
      setView("thread");
      searchParams.delete("chat");
      setSearchParams(searchParams, { replace: true });
      loadContactNameForConversation(chatId);
    }
  }, [searchParams, session?.user?.id, isAllowed]);

  // Count total unread messages
  useEffect(() => {
    if (!isAllowed || !session?.user) return;
    countUnread();

    const channel = supabase
      .channel("chat-unread-counter")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "internal_messages" },
        () => countUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id, isAllowed]);

  if (!isAllowed) return null;

  const loadContactNameForConversation = async (convId: string) => {
    if (!session?.user) return;
    const { data: participants } = await supabase
      .from("internal_conversation_participants" as any)
      .select("user_id")
      .eq("conversation_id", convId)
      .neq("user_id", session.user.id);

    if (participants && participants.length > 0) {
      const otherUserId = (participants[0] as any).user_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", otherUserId)
        .single();

      if (profile) {
        const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Chat";
        setSelectedContact({ user_id: otherUserId, name, conversationId: convId });
      }
    }
  };

  const countUnread = async () => {
    if (!session?.user) return;
    const { data: myParts } = await supabase
      .from("internal_conversation_participants" as any)
      .select("conversation_id")
      .eq("user_id", session.user.id);

    if (!myParts || myParts.length === 0) { setTotalUnread(0); return; }

    const convIds = myParts.map((p: any) => p.conversation_id);
    const { count } = await supabase
      .from("internal_messages" as any)
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", session.user.id)
      .is("read_at", null);

    setTotalUnread(count || 0);
  };

  const handleSelectContact = async (contact: any) => {
    if (contact.conversationId) {
      setActiveConversationId(contact.conversationId);
      setSelectedContact(contact);
      setView("thread");
    } else {
      if (!session?.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("user_id", session.user.id)
        .single();

      if (!profile?.organization_id) return;

      const { data: conv, error: convError } = await supabase
        .from("internal_conversations" as any)
        .insert({ organization_id: profile.organization_id } as any)
        .select()
        .single();

      if (convError || !conv) { console.error("Failed to create conversation:", convError); return; }

      const convId = (conv as any).id;

      await supabase
        .from("internal_conversation_participants" as any)
        .insert([
          { conversation_id: convId, user_id: session.user.id },
          { conversation_id: convId, user_id: contact.user_id },
        ] as any);

      setActiveConversationId(convId);
      setSelectedContact({ ...contact, conversationId: convId });
      setView("thread");
    }
  };

  const toggleChat = () => {
    if (view === "closed") {
      setView("contacts");
    } else {
      setView("closed");
      setSelectedContact(null);
      setActiveConversationId(null);
    }
  };

  return (
    <>
      {/* Chat Window */}
      {view !== "closed" && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] w-[340px] h-[440px] bg-card border rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <button
            onClick={toggleChat}
            className="absolute top-2 right-2 z-10 h-6 w-6 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {view === "contacts" && (
            <InternalChatContactList onSelectContact={handleSelectContact} />
          )}

          {view === "thread" && activeConversationId && selectedContact && (
            <InternalChatThread
              conversationId={activeConversationId}
              contactName={selectedContact.name}
              onBack={() => { setView("contacts"); setSelectedContact(null); setActiveConversationId(null); }}
            />
          )}
        </div>
      )}

      {/* Floating Bubble */}
      <button
        onClick={toggleChat}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[59] h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        style={{ display: view !== "closed" ? "none" : "flex" }}
      >
        <MessageCircle className="h-5 w-5" />
        {totalUnread > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 min-w-[20px] flex items-center justify-center p-0 text-xs"
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </Badge>
        )}
      </button>
    </>
  );
}
