import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import ProfileSetup from '@/components/ProfileSetup';
import OrganizerOnboarding from '@/components/OrganizerOnboarding';

const Onboarding = () => {
  const [loading, setLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [needsStripeOnboarding, setNeedsStripeOnboarding] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    } else {
      navigate('/auth');
    }
  }, [user, navigate]);

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      // Check if user profile exists
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('full_name, stripe_onboarding_complete')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!userProfile || !userProfile.full_name) {
        setNeedsProfile(true);
      } else if (!userProfile.stripe_onboarding_complete) {
        setNeedsStripeOnboarding(true);
      } else {
        // All onboarding complete
        toast({
          title: "Welcome back!",
          description: "Your account is fully set up.",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Onboarding check error:', error);
      toast({
        title: "Error",
        description: "Failed to check onboarding status.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileComplete = () => {
    setNeedsProfile(false);
    setNeedsStripeOnboarding(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  if (needsProfile) {
    return <ProfileSetup onComplete={handleProfileComplete} />;
  }

  if (needsStripeOnboarding) {
    return <OrganizerOnboarding />;
  }

  return null;
};

export default Onboarding;