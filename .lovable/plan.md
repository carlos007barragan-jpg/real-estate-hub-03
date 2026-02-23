

## Internal Chat for Supreme Admins (with Notifications)

### Overview
A small floating chat widget in the bottom-right corner, visible only to supreme admins. When you send a message, the recipient gets a notification via the existing notification bell -- clicking it opens the chat directly to that conversation. All history is saved permanently.

### How It Works

1. **Chat bubble** -- A small message icon fixed to the bottom-right corner (above the mobile nav on phones). Only renders for supreme_admin users. Shows unread count badge.

2. **Contact picker** -- Click the bubble to see a list of other supreme admins in your organization. Each contact shows their name and last message preview.

3. **Conversation thread** -- Tap a contact to open a compact chat window (~350px wide, ~450px tall). Messages display like a standard chat (yours on the right, theirs on the left). Type and send at the bottom.

4. **Notifications** -- When you send a message, a notification is inserted for the recipient using the existing notifications table. The notification title says "New Message from [Your Name]" and the description shows a preview. Clicking the notification in the bell opens the chat widget to that conversation.

5. **Real-time** -- Messages arrive instantly via database realtime subscriptions. No need to refresh.

6. **Persistent history** -- All conversations are stored. Close the chat, come back later, everything is still there.

### Technical Details

```text
Database migration (3 tables + realtime + RLS):

1. internal_conversations
   - id (uuid, PK, default gen_random_uuid())
   - organization_id (uuid, NOT NULL)
   - created_at (timestamptz, default now())
   - updated_at (timestamptz, default now())

2. internal_conversation_participants
   - id (uuid, PK, default gen_random_uuid())
   - conversation_id (uuid, FK -> internal_conversations.id ON DELETE CASCADE)
   - user_id (uuid, NOT NULL)
   - created_at (timestamptz, default now())
   - UNIQUE(conversation_id, user_id)

3. internal_messages
   - id (uuid, PK, default gen_random_uuid())
   - conversation_id (uuid, FK -> internal_conversations.id ON DELETE CASCADE)
   - sender_id (uuid, NOT NULL)
   - content (text, NOT NULL)
   - read_at (timestamptz, nullable)
   - created_at (timestamptz, default now())

Realtime:
   ALTER PUBLICATION supabase_realtime ADD TABLE internal_messages;

RLS policies (all tables):
   - Use has_role(auth.uid(), 'admin') which already covers supreme_admin
   - Scope to organization via get_user_organization_id(auth.uid())
   - SELECT: must be participant + supreme_admin
   - INSERT messages: must be participant + supreme_admin
   - INSERT conversations/participants: must be supreme_admin in same org
   - UPDATE messages: sender can mark as read

Database trigger -- notify on new message:
   - When a new row is inserted into internal_messages, a trigger fires
   - It inserts a row into the notifications table for each participant
     who is NOT the sender
   - Notification fields:
     - type: 'internal_chat'
     - event_type: 'internal_chat_message'
     - title: 'New Message from [sender name]'
     - description: first 100 chars of message content
     - link: '/dashboard?chat=[conversation_id]'
     - entity_type: 'internal_message'
     - entity_id: the message id

New frontend files:

1. src/components/InternalChat.tsx (main widget)
   - Fixed position bottom-right, z-60
   - Three states: closed (bubble only), contact list, conversation
   - Only renders when role === 'supreme_admin'
   - Subscribes to realtime on internal_messages
   - Reads URL param ?chat= to auto-open a conversation from notification click
   - Unread count badge on the bubble

2. src/components/InternalChatContactList.tsx
   - Queries profiles + user_roles for other supreme_admins in org
   - Shows last message preview per contact
   - Unread count per conversation
   - Click to open thread (creates conversation if none exists)

3. src/components/InternalChatThread.tsx
   - Message list with ScrollArea
   - Send input at bottom
   - Auto-scroll to latest
   - Marks messages as read when conversation is open

Files to edit:

- src/components/Layout.tsx
   - Add <InternalChat /> after <GlobalCallManager />
   - Single line addition

- src/components/NotificationBell.tsx
   - Add 'internal_chat_message' to supreme_admin event permissions
   - Add icon mapping for 'internal_chat' type
   - Handle click on chat notifications to set URL param
     that triggers the chat widget to open
```

