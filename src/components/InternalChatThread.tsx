import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface InternalChatThreadProps {
  conversationId: string;
  contactName: string;
  onBack: () => void;
}

export function InternalChatThread({ conversationId, contactName, onBack }: InternalChatThreadProps) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("internal_messages" as any)
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as any);
  };

  // Mark unread messages as read
  const markAsRead = async () => {
    if (!session?.user) return;
    await supabase
      .from("internal_messages" as any)
      .update({ read_at: new Date().toISOString() } as any)
      .eq("conversation_id", conversationId)
      .neq("sender_id", session.user.id)
      .is("read_at", null);
  };

  useEffect(() => {
    fetchMessages();
    markAsRead();

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "internal_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          markAsRead();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !session?.user || sending) return;
    setSending(true);
    const { error } = await supabase
      .from("internal_messages" as any)
      .insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: newMessage.trim(),
      } as any);
    if (!error) {
      setNewMessage("");
      // Also update conversation updated_at
      await supabase
        .from("internal_conversations" as any)
        .update({ updated_at: new Date().toISOString() } as any)
        .eq("id", conversationId);
    }
    setSending(false);
  };

  const isMe = (senderId: string) => senderId === session?.user?.id;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-7 w-7 p-0">
          ←
        </Button>
        <span className="font-semibold text-sm truncate">{contactName}</span>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No messages yet. Say hello!
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${isMe(msg.sender_id) ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                  isMe(msg.sender_id)
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                <p className="break-words">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${
                  isMe(msg.sender_id) ? "text-primary-foreground/60" : "text-muted-foreground"
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-2 border-t flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="text-sm h-9"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <Button size="sm" onClick={handleSend} disabled={!newMessage.trim() || sending} className="h-9 w-9 p-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
