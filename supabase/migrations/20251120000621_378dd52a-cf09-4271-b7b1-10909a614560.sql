-- Fix cascade delete for organization-related foreign keys

-- Drop and recreate the foreign key on transaction_types with CASCADE
ALTER TABLE public.transaction_types
DROP CONSTRAINT IF EXISTS transaction_types_organization_id_fkey;

ALTER TABLE public.transaction_types
ADD CONSTRAINT transaction_types_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;

-- Drop and recreate the foreign key on custom_fields with CASCADE
ALTER TABLE public.custom_fields
DROP CONSTRAINT IF EXISTS custom_fields_organization_id_fkey;

ALTER TABLE public.custom_fields
ADD CONSTRAINT custom_fields_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;

-- Drop and recreate the foreign key on profiles with CASCADE
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_organization_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;

-- Drop and recreate the foreign key on user_invitations with CASCADE
ALTER TABLE public.user_invitations
DROP CONSTRAINT IF EXISTS user_invitations_organization_id_fkey;

ALTER TABLE public.user_invitations
ADD CONSTRAINT user_invitations_organization_id_fkey
FOREIGN KEY (organization_id)
REFERENCES public.organizations(id)
ON DELETE CASCADE;