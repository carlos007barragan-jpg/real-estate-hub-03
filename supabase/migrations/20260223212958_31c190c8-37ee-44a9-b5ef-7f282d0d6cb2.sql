
CREATE OR REPLACE FUNCTION public.notify_on_internal_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      'internal_message', NEW.id, NEW.sender_id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
