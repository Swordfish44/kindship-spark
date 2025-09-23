import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Heart, CreditCard, Lock, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { centsToDisplay, dollarsToCents, centsToNumber, parseInputToCents } from '@/lib/currency';
import RewardTierCard from './RewardTierCard';

interface RewardTier {
  id: string;
  title: string;
  description: string;
  minimum_amount_cents: number;
  minimum_amount: number; // Keep for backwards compatibility during transition
  estimated_delivery?: string;
  quantity_limit?: number;
  quantity_claimed: number;
  is_active: boolean;
}

interface Campaign {
  id: string;
  title: string;
  slug: string;
  organizer: {
    full_name: string;
  };
}

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign;
}

const DonationModal = ({ isOpen, onClose, campaign }: DonationModalProps) => {
  const [amountCents, setAmountCents] = useState<number>(2500); // $25 in cents
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [selectedTier, setSelectedTier] = useState<RewardTier | null>(null);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  const presetAmountsCents = [1000, 2500, 5000, 10000, 25000, 50000]; // $10, $25, $50, $100, $250, $500

  useEffect(() => {
    if (isOpen) {
      fetchRewardTiers();
      getCurrentUser();
    }
  }, [isOpen, campaign.id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      setDonorEmail(user.email || '');
      
      // Get user profile for name
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (profile?.full_name) {
        setDonorName(profile.full_name);
      }
    }
  };

  const fetchRewardTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('reward_tiers')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('is_active', true)
        .order('minimum_amount_cents', { ascending: true });

      if (error) throw error;
      setRewardTiers(data || []);
    } catch (error) {
      console.error('Error fetching reward tiers:', error);
    }
  };

  const handleAmountSelect = (valueCents: number) => {
    setAmountCents(valueCents);
    setCustomAmount('');
    
    // Auto-select appropriate reward tier
    if (rewardTiers.length > 0) {
      const tier = rewardTiers
        .filter(t => (t.minimum_amount_cents || dollarsToCents(t.minimum_amount || 0)) <= valueCents)
        .sort((a, b) => (b.minimum_amount_cents || dollarsToCents(b.minimum_amount || 0)) - (a.minimum_amount_cents || dollarsToCents(a.minimum_amount || 0)))[0];
      
      setSelectedTier(tier || null);
    }
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    const amountCentsValue = parseInputToCents(value);
    
    if (amountCentsValue && amountCentsValue > 0) {
      setAmountCents(amountCentsValue);
      
      // Auto-select appropriate reward tier
      if (rewardTiers.length > 0) {
        const tier = rewardTiers
          .filter(t => (t.minimum_amount_cents || dollarsToCents(t.minimum_amount || 0)) <= amountCentsValue)
          .sort((a, b) => (b.minimum_amount_cents || dollarsToCents(b.minimum_amount || 0)) - (a.minimum_amount_cents || dollarsToCents(a.minimum_amount || 0)))[0];
        
        setSelectedTier(tier || null);
      }
    }
  };

  const handleTierSelect = (tier: RewardTier) => {
    setSelectedTier(tier);
    const tierMinimumCents = tier.minimum_amount_cents || dollarsToCents(tier.minimum_amount || 0);
    if (amountCents < tierMinimumCents) {
      setAmountCents(tierMinimumCents);
      setCustomAmount('');
    }
  };

  const calculatePlatformFee = (amountCents: number) => {
    return Math.round(amountCents * 0.08);
  };

  const handleDonate = async () => {
    if (!donorEmail || !amountCents || amountCents < 100) { // Minimum $1.00
      toast({
        title: "Missing information",
        description: "Please provide your email and a valid donation amount (minimum $1.00).",
        variant: "destructive",
      });
      return;
    }

    if (selectedTier) {
      const tierMinimumCents = selectedTier.minimum_amount_cents || dollarsToCents(selectedTier.minimum_amount || 0);
      if (amountCents < tierMinimumCents) {
        toast({
          title: "Amount too low",
          description: `Minimum donation for this reward tier is ${centsToDisplay(tierMinimumCents)}.`,
          variant: "destructive",
        });
        return;
      }
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          campaign_id: campaign.id,
          amount_cents: amountCents,
          reward_tier_id: selectedTier?.id || null,
          donor_name: donorName,
          donor_email: donorEmail,
          anonymous,
          message,
          success_url: `${window.location.origin}/donation/success?campaign=${campaign.slug}`,
          cancel_url: `${window.location.origin}/campaigns/${campaign.slug}`,
        },
      });

      if (error) throw error;

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }

    } catch (error) {
      console.error('Donation error:', error);
      toast({
        title: "Donation failed",
        description: error instanceof Error ? error.message : "Failed to process donation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const platformFeeCents = calculatePlatformFee(amountCents);
  const organizerAmountCents = amountCents - platformFeeCents;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Support {campaign.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Selection */}
          <div>
            <Label className="text-base font-medium">Choose your donation amount</Label>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {presetAmountsCents.map((presetCents) => (
                <Button
                  key={presetCents}
                  variant={amountCents === presetCents && !customAmount ? "default" : "outline"}
                  onClick={() => handleAmountSelect(presetCents)}
                  className="h-12"
                >
                  {centsToDisplay(presetCents)}
                </Button>
              ))}
            </div>
            
            <div className="mt-3">
              <Input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                min="1"
                step="0.01"
              />
            </div>
          </div>

          {/* Reward Tiers */}
          {rewardTiers.length > 0 && (
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Choose a reward (optional)
              </Label>
              <div className="space-y-3 mt-3">
                {rewardTiers.map((tier) => (
                  <RewardTierCard
                    key={tier.id}
                    tier={tier}
                    onSelect={handleTierSelect}
                    isSelected={selectedTier?.id === tier.id}
                    disabled={amountCents < (tier.minimum_amount_cents || dollarsToCents(tier.minimum_amount || 0))}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Donor Information */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Your information</Label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="donor-name">Full Name (optional)</Label>
                <Input
                  id="donor-name"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <Label htmlFor="donor-email">Email Address *</Label>
                <Input
                  id="donor-email"
                  type="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message">Message to organizer (optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share why you're supporting this campaign..."
                className="min-h-[80px]"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {message.length}/500 characters
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={anonymous}
                onCheckedChange={(checked) => setAnonymous(checked === true)}
              />
              <Label htmlFor="anonymous" className="text-sm">
                Make this donation anonymous
              </Label>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Payment Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Donation amount:</span>
                <span>{centsToDisplay(amountCents)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Platform fee (8%):</span>
                <span>{centsToDisplay(platformFeeCents)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>To {campaign.organizer.full_name}:</span>
                <span>{centsToDisplay(organizerAmountCents)}</span>
              </div>
            </div>
            
            {selectedTier && (
              <div className="mt-3 p-2 bg-primary/10 rounded">
                <Badge className="mb-1">Selected Reward</Badge>
                <p className="text-xs font-medium">{selectedTier.title}</p>
                {selectedTier.estimated_delivery && (
                  <p className="text-xs text-muted-foreground">
                    Estimated delivery: {new Date(selectedTier.estimated_delivery).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Your payment is secured by Stripe. We never store your payment information.</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleDonate} 
              disabled={processing || !donorEmail || !amountCents}
              className="flex-1"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {processing ? 'Processing...' : `Donate ${centsToDisplay(amountCents)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonationModal;