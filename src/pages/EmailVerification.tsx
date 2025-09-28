import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EmailVerification = () => {
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: type as any,
          });
          
          if (error) {
            toast({
              title: "Verification failed",
              description: error.message,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Email verified!",
              description: "Your email has been successfully verified.",
            });
          }
        }
      } catch (error) {
        console.error('Email verification error:', error);
        toast({
          title: "Verification error",
          description: "An error occurred during email verification.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        // Redirect to home page after verification attempt
        setTimeout(() => navigate('/'), 2000);
      }
    };

    handleEmailVerification();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="text-center">
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Verifying your email...</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">Email Verification</h1>
            <p className="text-muted-foreground mb-4">Redirecting you to the home page...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerification;