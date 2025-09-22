import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import OrganizerOnboarding from '@/components/OrganizerOnboarding';
import { useToast } from '@/hooks/use-toast';

const Onboarding = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to access the onboarding process.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      setIsAuthenticated(true);

      // Check if user profile exists and onboarding is complete
      const { data: userProfile } = await supabase
        .from('users')
        .select('stripe_onboarding_complete')
        .eq('id', session.user.id)
        .single();

      if (userProfile?.stripe_onboarding_complete) {
        toast({
          title: "Onboarding complete",
          description: "You have already completed the onboarding process.",
        });
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Auth check error:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <OrganizerOnboarding />;
};

export default Onboarding;