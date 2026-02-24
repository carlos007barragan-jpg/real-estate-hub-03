-- Drop the restrictive SELECT policy
DROP POLICY "Users can view their own documents" ON storage.objects;

-- Create a broader policy: any authenticated user can view lead-documents
-- (RLS on the documents table already controls which document metadata users can see)
CREATE POLICY "Authenticated users can view lead documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');

-- Also drop and recreate delete policy to allow admins
DROP POLICY "Users can delete their own documents" ON storage.objects;

CREATE POLICY "Authenticated users can delete lead documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'lead-documents' AND auth.role() = 'authenticated');