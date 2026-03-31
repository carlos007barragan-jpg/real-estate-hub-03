
-- Fix lead-documents storage policies to check folder ownership
DROP POLICY IF EXISTS "Authenticated users can view lead documents" ON storage.objects;
CREATE POLICY "Authenticated users can view lead documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lead-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users can delete lead documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete lead documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lead-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
