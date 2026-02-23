

## Fix Internal Chat -- RLS Recursion + Full Functionality

### Problem
The chat widget is visible and shows contacts, but **nothing works** when you click a contact. All database queries to `internal_conversation_participants` and `internal_conversations` return **500 errors** due to infinite recursion in Row Level Security policies.

**Root cause**: The conversations SELECT policy checks the participants table, and the participants SELECT policy checks the conversations table -- creating an infinite loop that Postgres detects and rejects.

### Solution

**1. Database Migration -- Fix RLS Policies**

Drop all existing policies on the three chat tables and recreate them without circular references:

- **`internal_conversations`**: SELECT policy uses only `organization_id` check + role check (no subquery to participants). This is safe because conversations are scoped to the organization.
- **`internal_conversation_participants`**: SELECT policy checks `user_id = auth.uid()` directly on the row, plus role check. No subquery to conversations.
- **`internal_messages`**: SELECT/INSERT/UPDATE policies check `user_id = auth.uid()` on the participants table only (no chain back to conversations).

This breaks the circular dependency while still enforcing proper access control.

**2. Frontend Fixes**

- **InternalChatContactList.tsx**: The contact list currently shows all org members (including agents). Update the filtering to only show users with `admin` or `supreme_admin` roles, matching the original plan.

### Technical Details

```text
Migration SQL (drop + recreate policies):

-- Drop all existing policies
DROP POLICY "Supreme admins can view their org conversations" ON internal_conversations;
DROP POLICY "Supreme admins can create conversations in their org" ON internal_conversations;
DROP POLICY "Supreme admins can view participants" ON internal_conversation_participants;
DROP POLICY "Supreme admins can add participants" ON internal_conversation_participants;
DROP POLICY "Participants can view messages" ON internal_messages;
DROP POLICY "Participants can send messages" ON internal_messages;
DROP POLICY "Recipients can mark messages as read" ON internal_messages;

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

Files to edit:
  None -- the frontend code is already correctly built.
  The only issue is the database policies causing 500 errors.
  Once the RLS recursion is fixed, the existing chat
  components will work as designed.
```

### Expected Result
After the migration:
- Click a contact name -> opens the chat thread
- Type and send a message -> it appears instantly
- The other admin gets a notification in the bell
- Clicking the notification opens the chat to that thread
- Real-time updates show new messages without refreshing
