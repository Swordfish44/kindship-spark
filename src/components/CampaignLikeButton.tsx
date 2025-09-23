import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CampaignLikeButtonProps {
  campaignId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showCount?: boolean;
  className?: string;
}

const CampaignLikeButton = ({ 
  campaignId, 
  variant = 'outline', 
  size = 'default',
  showCount = true,
  className 
}: CampaignLikeButtonProps) => {
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    fetchLikeStatus();
    fetchLikeCount();
  }, [campaignId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchLikeStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('campaign_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('campaign_id', campaignId)
        .single();

      setIsLiked(!!data);
    } catch (error) {
      // Not liked if no record found
      setIsLiked(false);
    }
  };

  const fetchLikeCount = async () => {
    try {
      const { count, error } = await supabase
        .from('campaign_likes')
        .select('id', { count: 'exact' })
        .eq('campaign_id', campaignId);

      if (error) throw error;
      setLikeCount(count || 0);
    } catch (error) {
      console.error('Error fetching like count:', error);
    }
  };

  const toggleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like campaigns",
        variant: "destructive",
      });
      return;
    }

    if (loading) return;
    setLoading(true);

    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('campaign_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('campaign_id', campaignId);

        if (error) throw error;

        setIsLiked(false);
        setLikeCount(prev => prev - 1);
        
        toast({
          title: "Removed from favorites",
          description: "Campaign removed from your liked list",
        });
      } else {
        // Like
        const { error } = await supabase
          .from('campaign_likes')
          .insert({
            user_id: user.id,
            campaign_id: campaignId
          });

        if (error) throw error;

        setIsLiked(true);
        setLikeCount(prev => prev + 1);

        // Create activity record
        await supabase.from('user_activities').insert({
          user_id: user.id,
          activity_type: 'campaign_liked',
          campaign_id: campaignId
        });

        toast({
          title: "Added to favorites",
          description: "Campaign added to your liked list",
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleLike}
      disabled={loading}
      className={cn(
        "transition-all duration-200",
        isLiked && "text-red-500 border-red-500 hover:bg-red-50 hover:text-red-600",
        className
      )}
    >
      <Heart 
        className={cn(
          "h-4 w-4",
          size === 'sm' && "h-3 w-3",
          size === 'lg' && "h-5 w-5",
          showCount && "mr-2",
          isLiked && "fill-current"
        )} 
      />
      {showCount && (
        <span className="tabular-nums">
          {likeCount > 0 ? likeCount : 'Like'}
        </span>
      )}
    </Button>
  );
};

export default CampaignLikeButton;