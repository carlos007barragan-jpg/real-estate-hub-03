
-- 1. Create all tables
CREATE TABLE public.internal_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.internal_conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.internal_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.internal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.internal_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.internal_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

-- 3. Conversations policies
CREATE POLICY "Supreme admins can view their org conversations"
  ON public.internal_conversations FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.internal_conversation_participants p
      WHERE p.conversation_id = id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Supreme admins can create conversations in their org"
  ON public.internal_conversations FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
  );

-- 4. Participants policies
CREATE POLICY "Supreme admins can view participants"
  ON public.internal_conversation_participants FOR SELECT
  USING (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.internal_conversations c
      WHERE c.id = conversation_id
      AND c.organization_id = get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "Supreme admins can add participants"
  ON public.internal_conversation_participants FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.internal_conversations c
      WHERE c.id = conversation_id
      AND c.organization_id = get_user_organization_id(auth.uid())
    )
  );

-- 5. Messages policies
CREATE POLICY "Participants can view messages"
  ON public.internal_messages FOR SELECT
  USING (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.internal_conversation_participants p
      WHERE p.conversation_id = internal_messages.conversation_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.internal_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.internal_conversation_participants p
      WHERE p.conversation_id = internal_messages.conversation_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.internal_messages FOR UPDATE
  USING (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.internal_conversation_participants p
      WHERE p.conversation_id = internal_messages.conversation_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.internal_conversation_participants p
      WHERE p.conversation_id = internal_messages.conversation_id AND p.user_id = auth.uid()
    )
  );

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.internal_messages;

-- 7. Updated_at trigger function + trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_internal_conversations_updated_at
  BEFORE UPDATE ON public.internal_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 8. Notification trigger
CREATE OR REPLACE FUNCTION public.notify_on_internal_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name text;
  conv_org_id uuid;
  participant record;
BEGIN
  SELECT COALESCE(first_name || ' ' || last_name, email, 'Someone')
    INTO sender_name
    FROM public.profiles
    WHERE user_id = NEW.sender_id
    LIMIT 1;

  SELECT organization_id INTO conv_org_id
    FROM public.internal_conversations
    WHERE id = NEW.conversation_id;

  FOR participant IN
    SELECT user_id FROM public.internal_conversation_participants
    WHERE conversation_id = NEW.conversation_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO public.notifications (
      user_id, organization_id, type, event_type, title, description,
      link, entity_type, entity_id, created_by
    ) VALUES (
      participant.user_id, conv_org_id, 'internal_chat', 'internal_chat_message',
      'New Message from ' || sender_name,
      substring(NEW.content from 1 for 100),
      '/dashboard?chat=' || NEW.conversation_id::text,
      'internal_message', NEW.id::text, NEW.sender_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_notify_on_internal_message
  AFTER INSERT ON public.internal_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_internal_message();
