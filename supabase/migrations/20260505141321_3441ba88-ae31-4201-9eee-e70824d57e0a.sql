CREATE OR REPLACE FUNCTION public.auto_publish_owner_finance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.show_on_public_page IS NOT TRUE
     AND LOWER(COALESCE(NEW.transaction_type,'')) LIKE '%owner%finance%'
     AND COALESCE(NEW.status,'available') IN ('available','coming_soon') THEN
    NEW.show_on_public_page := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_publish_owner_finance_trigger ON public.inventory;
CREATE TRIGGER auto_publish_owner_finance_trigger
BEFORE INSERT ON public.inventory
FOR EACH ROW
EXECUTE FUNCTION public.auto_publish_owner_finance();