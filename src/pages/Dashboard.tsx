import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import OrganizerPayoutSetup from "@/components/OrganizerPayoutSetup";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, Edit, DollarSign, Target, Users, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalRaised: number;
  totalDonations: number;
  activeCampaigns: number;
  totalCampaigns: number;
}

interface Campaign {
  id: string;
  title: string;
  slug: string;
  status: string;
  funding_goal: number;
  current_amount: number;
  created_at: string;
}

interface Donation {
  id: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  created_at: string;
  campaign_title: string;
  anonymous: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalRaised: 0,
    totalDonations: 0,
    activeCampaigns: 0,
    totalCampaigns: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    await loadDashboardData(user.id);
  };

  const loadDashboardData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Load user profile data including KYC status
      const { data: profileData } = await supabase
        .from("users")
        .select("id, kyc_status, stripe_onboarding_complete, stripe_account_id")
        .eq("id", userId)
        .maybeSingle();
      
      setUserProfile(profileData);
      
      // Load user's campaigns
      const { data: campaignsData } = await supabase
        .from("campaigns")
        .select("*")
        .eq("organizer_id", userId)
        .order("created_at", { ascending: false });

      setCampaigns(campaignsData || []);

      // Calculate stats
      const activeCampaigns = campaignsData?.filter(c => c.status === "active").length || 0;
      const totalRaised = campaignsData?.reduce((sum, c) => sum + (c.current_amount || 0), 0) || 0;

      // Load recent donations for user's campaigns
      const campaignIds = campaignsData?.map(c => c.id) || [];
      
      if (campaignIds.length > 0) {
        const { data: donationsData } = await supabase
          .from("donations")
          .select(`
            id,
            amount,
            donor_name,
            donor_email,
            created_at,
            anonymous,
            campaigns!inner (
              title
            )
          `)
          .in("campaign_id", campaignIds)
          .order("created_at", { ascending: false })
          .limit(10);

        const formattedDonations = donationsData?.map(d => ({
          ...d,
          campaign_title: (d as any).campaigns.title
        })) || [];

        setRecentDonations(formattedDonations);
        
        setStats({
          totalRaised,
          totalDonations: donationsData?.length || 0,
          activeCampaigns,
          totalCampaigns: campaignsData?.length || 0,
        });
      } else {
        setStats({
          totalRaised: 0,
          totalDonations: 0,
          activeCampaigns: 0,
          totalCampaigns: 0,
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "draft":
        return "secondary";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const calculateProgress = (current: number, goal: number) => {
    return goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Button onClick={() => navigate("/create-campaign")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Raised</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalRaised)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Donations</p>
                <p className="text-2xl font-bold">{stats.totalDonations}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{stats.activeCampaigns}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center">
              <Calendar className="w-8 h-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
                <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Payout Setup Section */}
        <div className="mb-8">
          <OrganizerPayoutSetup
            kycStatus={userProfile?.kyc_status}
            onboardingCompleted={userProfile?.stripe_onboarding_complete}
            onStatusUpdate={() => loadDashboardData(user.id)}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="campaigns" className="space-y-6">
          <TabsList>
            <TabsTrigger value="campaigns">My Campaigns</TabsTrigger>
            <TabsTrigger value="donations">Recent Donations</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns">
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">My Campaigns</h2>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first campaign to start raising funds
                    </p>
                    <Button onClick={() => navigate("/create-campaign")}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Campaign
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Raised / Goal</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{campaign.title}</p>
                              <p className="text-sm text-muted-foreground">/{campaign.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="w-20">
                              <div className="bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all"
                                  style={{
                                    width: `${calculateProgress(campaign.current_amount, campaign.funding_goal)}%`,
                                  }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {Math.round(calculateProgress(campaign.current_amount, campaign.funding_goal))}%
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatCurrency(campaign.current_amount || 0)}</p>
                              <p className="text-sm text-muted-foreground">
                                of {formatCurrency(campaign.funding_goal || 0)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/campaign/${campaign.slug}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/create-campaign?edit=${campaign.id}`)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="donations">
            <Card>
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Donations</h2>
                {recentDonations.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No donations yet</h3>
                    <p className="text-muted-foreground">
                      Donations to your campaigns will appear here
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Donor</TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentDonations.map((donation) => (
                        <TableRow key={donation.id}>
                          <TableCell>
                            {donation.anonymous ? (
                              <span className="text-muted-foreground">Anonymous</span>
                            ) : (
                              <div>
                                <p className="font-medium">{donation.donor_name}</p>
                                <p className="text-sm text-muted-foreground">{donation.donor_email}</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{donation.campaign_title}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(donation.amount)}
                          </TableCell>
                          <TableCell>
                            {new Date(donation.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}