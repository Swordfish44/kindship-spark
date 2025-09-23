import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Share2, Heart, Calendar, Users, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import ProgressBar from "@/components/ProgressBar";
import DonationModal from "@/components/DonationModal";
import CampaignUpdates from "@/components/CampaignUpdates";
import CampaignComments from "@/components/CampaignComments";
import RewardTierCard from "@/components/RewardTierCard";

interface Campaign {
  id: string;
  title: string;
  description: string;
  image_url: string;
  current_amount: number;
  funding_goal: number;
  slug: string;
  status: string;
  created_at: string;
  organizer_id: string;
  users?: {
    full_name: string;
    organization_name?: string;
  };
  campaign_categories?: {
    name: string;
    color_hex: string;
  };
}

interface RewardTier {
  id: string;
  title: string;
  description: string;
  minimum_amount: number;
  quantity_limit?: number;
  quantity_claimed: number;
  estimated_delivery?: string;
  is_active: boolean;
}

const CampaignDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [donationCount, setDonationCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (slug) {
      fetchCampaign();
      fetchRewardTiers();
      fetchDonationStats();
      getCurrentUser();
    }
  }, [slug]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchCampaign = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          users (full_name, organization_name),
          campaign_categories (name, color_hex)
        `)
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: "Campaign not found",
          description: "The campaign you're looking for doesn't exist or is not active.",
          variant: "destructive",
        });
        return;
      }

      setCampaign(data);
    } catch (error: any) {
      console.error("Error fetching campaign:", error);
      toast({
        title: "Error",
        description: "Failed to load campaign details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRewardTiers = async () => {
    if (!campaign?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("reward_tiers")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("is_active", true)
        .order("minimum_amount", { ascending: true });

      if (error) throw error;
      setRewardTiers(data || []);
    } catch (error: any) {
      console.error("Error fetching reward tiers:", error);
    }
  };

  const fetchDonationStats = async () => {
    if (!campaign?.id) return;
    
    try {
      const { count, error } = await supabase
        .from("donations")
        .select("id", { count: "exact" })
        .eq("campaign_id", campaign.id);

      if (error) throw error;
      setDonationCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching donation stats:", error);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: campaign?.title,
        text: campaign?.description,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied!",
        description: "Campaign link has been copied to your clipboard.",
      });
    }
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Removed from favorites" : "Added to favorites",
      description: isLiked ? "Campaign removed from your favorites." : "Campaign added to your favorites.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Campaign Not Found</h1>
          <p className="text-muted-foreground mb-8">The campaign you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/">Browse Campaigns</Link>
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = (campaign.current_amount / campaign.funding_goal) * 100;
  const daysLeft = Math.max(0, 30); // Placeholder - would calculate from end date

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-4" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Header */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                {campaign.campaign_categories && (
                  <Badge 
                    className="text-white"
                    style={{ backgroundColor: campaign.campaign_categories.color_hex }}
                  >
                    {campaign.campaign_categories.name}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  by {campaign.users?.organization_name || campaign.users?.full_name}
                </span>
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-bold mb-4">{campaign.title}</h1>
              
              <div className="flex items-center gap-4 mb-6">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleLike}
                  className={isLiked ? "text-red-500 border-red-500" : ""}
                >
                  <Heart className={`mr-2 h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                  {isLiked ? "Liked" : "Like"}
                </Button>
              </div>

              {campaign.image_url && (
                <img
                  src={campaign.image_url}
                  alt={campaign.title}
                  className="w-full h-64 lg:h-80 object-cover rounded-lg mb-6"
                />
              )}
            </div>

            {/* Campaign Tabs */}
            <Tabs defaultValue="story" className="w-full">
              <TabsList>
                <TabsTrigger value="story">Story</TabsTrigger>
                <TabsTrigger value="updates">Updates</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
              </TabsList>
              
              <TabsContent value="story" className="mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="prose max-w-none">
                      <p className="text-lg leading-relaxed whitespace-pre-wrap">
                        {campaign.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="updates" className="mt-6">
                <CampaignUpdates 
                  campaignId={campaign.id} 
                  isOwner={campaign.organizer_id === user?.id}
                />
              </TabsContent>
              
              <TabsContent value="comments" className="mt-6">
                <CampaignComments campaignId={campaign.id} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Funding Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Funding Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Raised</span>
                    <span className="font-medium">${campaign.current_amount.toLocaleString()}</span>
                  </div>
                  <ProgressBar 
                    current={campaign.current_amount} 
                    target={campaign.funding_goal} 
                  />
                  <div className="text-sm text-muted-foreground">
                    {progressPercentage.toFixed(1)}% of ${campaign.funding_goal.toLocaleString()} goal
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{donationCount}</div>
                    <div className="text-sm text-muted-foreground">Backers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{daysLeft}</div>
                    <div className="text-sm text-muted-foreground">Days left</div>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => setDonationModalOpen(true)}
                >
                  Back This Campaign
                </Button>
              </CardContent>
            </Card>

            {/* Reward Tiers */}
            {rewardTiers.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rewards</h3>
                {rewardTiers.map((tier) => (
                  <RewardTierCard
                    key={tier.id}
                    tier={tier}
                    onSelect={() => setDonationModalOpen(true)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {donationModalOpen && (
        <DonationModal
          isOpen={donationModalOpen}
          onClose={() => setDonationModalOpen(false)}
          campaign={{
            id: campaign.id,
            title: campaign.title,
            slug: campaign.slug || campaign.id,
            organizer: {
              full_name: campaign.users?.full_name || "Anonymous",
            },
          }}
        />
      )}
    </div>
  );
};

export default CampaignDetail;