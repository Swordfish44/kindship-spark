import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface AccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingComplete: boolean;
  country?: string;
  defaultCurrency?: string;
  requirements?: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
  };
}

interface StripeConnectOnboardingProps {
  /** Callback when onboarding is completed */
  onOnboardingComplete?: (accountId: string) => void;
}

/**
 * Stripe Connect Onboarding Component
 * 
 * This component handles the complete flow for onboarding sellers/vendors to Stripe Connect:
 * 1. Create a connected account
 * 2. Generate onboarding links
 * 3. Display account status and requirements
 * 4. Handle refresh/return from Stripe onboarding
 */
export function StripeConnectOnboarding({ onOnboardingComplete }: StripeConnectOnboardingProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountStatus | null>(null);
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');

  // Check URL parameters for return/refresh from Stripe onboarding
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const returnedAccountId = urlParams.get('account');
    const success = urlParams.get('success');
    const refresh = urlParams.get('refresh');

    if (returnedAccountId) {
      setAccountId(returnedAccountId);
      
      if (success === 'true') {
        toast.success('Onboarding completed successfully!');
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (refresh === 'true') {
        toast.info('Please complete your onboarding to start accepting payments.');
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Fetch account status when accountId is available
  useEffect(() => {
    if (accountId) {
      fetchAccountStatus(accountId);
    }
  }, [accountId]);

  /**
   * Creates a new Stripe Connect account for the user
   */
  const createAccount = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-account',
          email: email.trim(),
          businessName: businessName.trim() || undefined,
          country: 'US' // TODO: Allow user to select country
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setAccountId(data.accountId);
      toast.success('Account created successfully! Now complete onboarding.');

    } catch (err: any) {
      console.error('Account creation failed:', err);
      setError(`Failed to create account: ${err.message}`);
      toast.error('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetches the current status of the connected account
   */
  const fetchAccountStatus = async (accId: string) => {
    try {
      const response = await fetch('/api/stripe-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get-account-status',
          accountId: accId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const status = await response.json();
      setAccountStatus(status);

      // Notify parent component if onboarding is complete
      if (status.onboardingComplete && onOnboardingComplete) {
        onOnboardingComplete(status.accountId);
      }

    } catch (err: any) {
      console.error('Failed to fetch account status:', err);
      setError(`Failed to fetch account status: ${err.message}`);
    }
  };

  /**
   * Creates an onboarding link and redirects the user to Stripe
   */
  const startOnboarding = async () => {
    if (!accountId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-onboarding-link',
          accountId: accountId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Redirect to Stripe onboarding
      window.location.href = data.url;

    } catch (err: any) {
      console.error('Onboarding link creation failed:', err);
      setError(`Failed to create onboarding link: ${err.message}`);
      toast.error('Failed to start onboarding');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renders the account status with appropriate badges and information
   */
  const renderAccountStatus = () => {
    if (!accountStatus) return null;

    const getStatusBadge = (enabled: boolean, label: string) => (
      <Badge variant={enabled ? "default" : "secondary"} className="flex items-center gap-1">
        {enabled ? (
          <CheckCircle className="h-3 w-3" />
        ) : (
          <AlertCircle className="h-3 w-3" />
        )}
        {label}
      </Badge>
    );

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {getStatusBadge(accountStatus.chargesEnabled, 'Charges')}
          {getStatusBadge(accountStatus.payoutsEnabled, 'Payouts')}
          {getStatusBadge(accountStatus.detailsSubmitted, 'Details Submitted')}
        </div>

        {accountStatus.onboardingComplete ? (
          <Alert className="border-success bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              Your account is fully onboarded and ready to accept payments!
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-warning bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              Complete onboarding to start accepting payments. 
              {accountStatus.requirements && accountStatus.requirements.currentlyDue.length > 0 && (
                <span className="block mt-1 text-sm">
                  Outstanding requirements: {accountStatus.requirements.currentlyDue.join(', ')}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Account ID:</strong> {accountStatus.accountId}</p>
          {accountStatus.country && (
            <p><strong>Country:</strong> {accountStatus.country.toUpperCase()}</p>
          )}
          {accountStatus.defaultCurrency && (
            <p><strong>Currency:</strong> {accountStatus.defaultCurrency.toUpperCase()}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Stripe Connect Onboarding
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
        </CardTitle>
        <CardDescription>
          Set up your Stripe Connect account to start accepting payments from customers.
          The platform will handle pricing and fee collection.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive-foreground">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!accountId ? (
          /* Account Creation Form */
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                This will be used for your Stripe account
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (Optional)</Label>
              <Input
                id="businessName"
                type="text"
                placeholder="Enter your business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave blank if you're an individual seller
              </p>
            </div>

            <Button 
              onClick={createAccount} 
              disabled={loading || !email.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Stripe Connect Account'
              )}
            </Button>
          </div>
        ) : (
          /* Account Status and Onboarding */
          <div className="space-y-4">
            {renderAccountStatus()}

            {accountStatus && !accountStatus.onboardingComplete && (
              <Button 
                onClick={startOnboarding} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Onboarding Link...
                  </>
                ) : (
                  <>
                    Complete Onboarding
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}

            {accountStatus && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => fetchAccountStatus(accountId)}
                  disabled={loading}
                  size="sm"
                >
                  Refresh Status
                </Button>
                
                {accountStatus.onboardingComplete && (
                  <Button 
                    variant="outline" 
                    onClick={() => window.open('https://dashboard.stripe.com/express', '_blank')}
                    size="sm"
                  >
                    Stripe Dashboard
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Information Box */}
        <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">How it works:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Create your Stripe Connect account with basic information</li>
            <li>Complete onboarding by providing required business details</li>
            <li>Once approved, you can create products and accept payments</li>
            <li>The platform handles pricing and takes a small commission</li>
            <li>You receive direct transfers to your bank account</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}