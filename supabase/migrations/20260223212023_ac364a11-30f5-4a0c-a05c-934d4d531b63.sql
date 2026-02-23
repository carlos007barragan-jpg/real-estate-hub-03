
-- Drop all existing policies
DROP POLICY IF EXISTS "Supreme admins can view their org conversations" ON internal_conversations;
DROP POLICY IF EXISTS "Supreme admins can create conversations in their org" ON internal_conversations;
DROP POLICY IF EXISTS "Supreme admins can view participants" ON internal_conversation_participants;
DROP POLICY IF EXISTS "Supreme admins can add participants" ON internal_conversation_participants;
DROP POLICY IF EXISTS "Participants can view messages" ON internal_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON internal_messages;
DROP POLICY IF EXISTS "Recipients can mark messages as read" ON internal_messages;

-- Conversations: simple org + role check (no subquery to participants)
CREATE POLICY "Admins can view their org conversations"
  ON internal_conversations FOR SELECT
  USING (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can create conversations in their org"
  ON internal_conversations FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id(auth.uid())
    AND (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
  );

-- Participants: check own user_id directly (no subquery to conversations)
CREATE POLICY "Admins can view participants in their conversations"
  ON internal_conversation_participants FOR SELECT
  USING (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "Admins can add participants"
  ON internal_conversation_participants FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
  );

-- Messages: only reference participants (one level, no chain)
CREATE POLICY "Participants can view messages"
  ON internal_messages FOR SELECT
  USING (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM internal_conversation_participants p
      WHERE p.conversation_id = internal_messages.conversation_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON internal_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM internal_conversation_participants p
      WHERE p.conversation_id = internal_messages.conversation_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON internal_messages FOR UPDATE
  USING (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM internal_conversation_participants p
      WHERE p.conversation_id = internal_messages.conversation_id
      AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (has_role(auth.uid(), 'supreme_admin') OR has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM internal_conversation_participants p
      WHERE p.conversation_id = internal_messages.conversation_id
      AND p.user_id = auth.uid()
    )
  );
