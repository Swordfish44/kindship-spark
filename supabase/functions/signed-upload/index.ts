import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const UploadRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  fileType: z.string().min(1, "File type is required"),
  fileSize: z.number().max(20 * 1024 * 1024, "File size must be under 20MB"),
  bucket: z.enum(['organizer-documents']).default('organizer-documents'),
});

// Structured logging utility
function logEvent(level: 'info' | 'warn' | 'error', event: string, data?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    level,
    event,
    function: 'signed-upload',
    ...data
  };
  console.log(JSON.stringify(logData));
}

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);
    
    logEvent('info', 'signed_upload_request_started');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logEvent('error', 'missing_auth_header');
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      logEvent('error', 'auth_failed', { error: authError?.message });
      throw new Error('Invalid auth token');
    }

    logEvent('info', 'user_authenticated', { userId: user.id });

    const requestBody = await req.json();
    const validationResult = UploadRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      logEvent('error', 'validation_failed', { errors });
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    const { fileName, fileType, fileSize, bucket } = validationResult.data;
    
    // Validate file type (only allow documents and images for organizer uploads)
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    
    if (!allowedTypes.includes(fileType)) {
      logEvent('error', 'invalid_file_type', { fileType, allowedTypes });
      throw new Error(`File type ${fileType} is not allowed`);
    }

    // Generate unique file path with user ID prefix for security
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;
    
    logEvent('info', 'generating_signed_url', { 
      fileName, 
      fileType, 
      fileSize, 
      uniqueFileName,
      bucket 
    });

    // Create signed URL for upload (expires in 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(uniqueFileName, {
        upsert: false,
      });

    if (signedUrlError) {
      logEvent('error', 'signed_url_creation_failed', { error: signedUrlError.message });
      throw new Error(`Failed to create signed URL: ${signedUrlError.message}`);
    }

    // Get signed URL for future downloads (expires in 1 year)
    const { data: downloadData } = await supabase.storage
      .from(bucket)
      .createSignedUrl(uniqueFileName, 365 * 24 * 60 * 60); // 1 year

    logEvent('info', 'signed_urls_created', { 
      uniqueFileName, 
      uploadToken: signedUrlData.token.substring(0, 10) + '...' 
    });

    return new Response(JSON.stringify({
      uploadUrl: signedUrlData.signedUrl,
      token: signedUrlData.token,
      path: uniqueFileName,
      downloadUrl: downloadData?.signedUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logEvent('error', 'signed_upload_failed', { 
      error: (error as Error).message || 'Unknown error',
      stack: (error as Error).stack?.split('\n').slice(0, 3).join('\n')
    });
    return new Response(JSON.stringify({ 
      error: (error as Error).message || 'Unknown error',
      timestamp: new Date().toISOString() 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});