import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type DocumentType = 'government_id_front' | 'government_id_back' | 'proof_of_address' | 'business_registration' | 'bank_statement';

interface DocumentUploadProps {
  documentType: DocumentType;
  label: string;
  description: string;
  required?: boolean;
  onUploadComplete?: (url: string) => void;
  existingUrl?: string;
}

const DocumentUpload = ({ 
  documentType, 
  label, 
  description, 
  required = false, 
  onUploadComplete,
  existingUrl 
}: DocumentUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>(existingUrl || '');
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please upload a JPEG, PNG, or PDF file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${documentType}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('organizer-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('organizer-documents')
        .getPublicUrl(fileName);

      // Save document record to database
      const { error: dbError } = await supabase
        .from('documents')
        .upsert({
          user_id: user.id,
          document_type: documentType,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      setUploadedUrl(publicUrl);
      onUploadComplete?.(publicUrl);
      
      toast({
        title: "Document uploaded successfully",
        description: `${label} has been uploaded and saved.`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">
            {label}
            {required && <span className="text-red-500">*</span>}
          </Label>
          {uploadedUrl && (
            <div className="flex items-center gap-1 text-green-600">
              <FileCheck className="h-4 w-4" />
              <span className="text-xs">Uploaded</span>
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">{description}</p>
        
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
          </div>
          
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Uploading...
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            Accepted formats: JPEG, PNG, PDF. Maximum file size: 5MB. 
            Documents should be clear and readable.
          </span>
        </div>
        
        {uploadedUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(uploadedUrl, '_blank')}
            className="w-full"
          >
            View Uploaded Document
          </Button>
        )}
      </div>
    </Card>
  );
};

export default DocumentUpload;