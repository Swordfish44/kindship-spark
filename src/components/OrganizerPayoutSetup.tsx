import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OrganizerPayoutSetupProps {
  kycStatus?: string;
  onboardingCompleted?: boolean;
  onStatusUpdate?: () => void;
}

export default function OrganizerPayoutSetup({ 
  kycStatus = 'pending', 
  onboardingCompleted = false,
  onStatusUpdate 
}: OrganizerPayoutSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatusBadge = () => {
    switch (kycStatus) {
      case 'verified':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'requirements_due':
        return (
          <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Action needed
          </Badge>
        );
      case 'restricted':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Restricted
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const getStatusMessage = () => {
    switch (kycStatus) {
      case 'verified':
        return 'Your account is verified and ready to receive payouts.';
      case 'requirements_due':
        return 'Additional information is required to complete verification.';
      case 'restricted':
        return 'Your account has been restricted. Please contact support.';
      default:
        return 'Connect your account to receive donations and start fundraising.';
    }
  };

  const getButtonText = () => {
    if (loading) return 'Opening...';
    if (kycStatus === 'requirements_due') return 'Complete verification';
    if (onboardingCompleted) return 'Update payout details';
    return 'Set up payouts';
  };

  async function handleSetup() {
    try {
      setLoading(true);
      setError(null);

        // Call the connect-link edge function using direct HTTP
        const response = await fetch('https://uobgytlnzmngwxmweufu.functions.supabase.co/connect-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({})
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorData}`);
        }

        const data = await response.json();

      if (!data?.url) {
        throw new Error('No onboarding URL received');
      }

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Payouts & Verification</CardTitle>
            <CardDescription>
              {getStatusMessage()}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {kycStatus === 'requirements_due' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium">Action Required</p>
                <p>Complete your verification to continue receiving donations.</p>
              </div>
            </div>
          </div>
        )}

        {kycStatus === 'verified' && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium">Verification Complete</p>
                <p>Your account is ready to receive payouts.</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleSetup} 
            disabled={loading}
            className="flex-1"
          >
            {getButtonText()}
          </Button>
          
          {kycStatus === 'verified' && onStatusUpdate && (
            <Button 
              variant="outline" 
              onClick={onStatusUpdate}
              disabled={loading}
            >
              Refresh Status
            </Button>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}