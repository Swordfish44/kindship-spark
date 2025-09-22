import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, Users } from 'lucide-react';

interface RewardTier {
  id: string;
  title: string;
  description: string;
  minimum_amount: number;
  estimated_delivery?: string;
  quantity_limit?: number;
  quantity_claimed: number;
  is_active: boolean;
}

interface RewardTierCardProps {
  tier: RewardTier;
  onSelect: (tier: RewardTier) => void;
  isSelected?: boolean;
  disabled?: boolean;
}

const RewardTierCard = ({ tier, onSelect, isSelected = false, disabled = false }: RewardTierCardProps) => {
  const isAvailable = tier.is_active && 
    (!tier.quantity_limit || tier.quantity_claimed < tier.quantity_limit);

  const availabilityText = tier.quantity_limit 
    ? `${tier.quantity_limit - tier.quantity_claimed} of ${tier.quantity_limit} left`
    : 'Unlimited availability';

  return (
    <Card className={`p-6 cursor-pointer transition-all ${
      isSelected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
    } ${!isAvailable || disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{tier.title}</h3>
            <p className="text-2xl font-bold text-primary">
              ${tier.minimum_amount.toLocaleString()}
              <span className="text-sm text-muted-foreground font-normal"> or more</span>
            </p>
          </div>
          {!isAvailable && (
            <Badge variant="secondary">Sold Out</Badge>
          )}
          {isSelected && (
            <Badge className="bg-primary">Selected</Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-muted-foreground">{tier.description}</p>

        {/* Details */}
        <div className="space-y-2 text-sm">
          {tier.estimated_delivery && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Estimated delivery: {new Date(tier.estimated_delivery).toLocaleDateString()}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{availabilityText}</span>
          </div>

          {tier.quantity_claimed > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{tier.quantity_claimed} backer{tier.quantity_claimed !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Select Button */}
        <Button 
          className="w-full" 
          variant={isSelected ? "default" : "outline"}
          onClick={() => onSelect(tier)}
          disabled={!isAvailable || disabled}
        >
          {isSelected ? 'Selected' : `Select $${tier.minimum_amount}+`}
        </Button>
      </div>
    </Card>
  );
};

export default RewardTierCard;