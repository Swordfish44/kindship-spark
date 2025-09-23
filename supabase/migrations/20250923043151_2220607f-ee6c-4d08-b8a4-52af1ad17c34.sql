-- Create policy for organizers to read their own documents
CREATE POLICY "organizer reads own storage"
ON storage.objects 
FOR SELECT
TO authenticated
USING (
  bucket_id = 'organizer-documents' 
  AND (metadata->>'organizer_id')::uuid = auth.uid()
);