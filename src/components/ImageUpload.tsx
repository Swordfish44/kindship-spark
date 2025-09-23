import React, { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
}

export default function ImageUpload({ 
  value, 
  onChange, 
  label = "Campaign Image",
  bucket = "campaign-images" 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const uploadFile = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to upload images",
          variant: "destructive"
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onChange(publicUrl);
      
      toast({
        title: "Success",
        description: "Image uploaded successfully"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }, [bucket, onChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      toast({
        title: "Success",
        description: "Image URL added successfully"
      });
    }
  };

  const removeImage = () => {
    onChange('');
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>
      
      {value ? (
        <div className="relative">
          <div className="relative w-full h-48 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted">
            <img 
              src={value} 
              alt="Campaign preview" 
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={removeImage}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-muted/30">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="image-upload"
              disabled={uploading}
            />
            <label 
              htmlFor="image-upload" 
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <div className="p-3 rounded-full bg-primary/10">
                {uploading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <Upload className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {uploading ? 'Uploading...' : 'Click to upload image'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP up to 10MB
                </p>
              </div>
            </label>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <Input
              type="url"
              placeholder="Enter image URL..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button 
              type="button" 
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}