import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Users, 
  Heart, 
  Award, 
  Share2, 
  Settings, 
  Calendar,
  MapPin,
  Link as LinkIcon,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Globe,
  UserPlus,
  UserCheck,
  MessageCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import CampaignCard from '@/components/CampaignCard';

interface UserProfileProps {
  userId: string;
  isCurrentUser?: boolean;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  organization_name?: string;
  created_at: string;
}

interface SocialAccount {
  platform: string;
  username: string;
  url?: string;
}

interface Achievement {
  achievement_type: string;
  unlocked_at: string;
  metadata: any;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  current_amount_cents: number;
  funding_goal_cents: number;
  slug: string;
  status: string;
  created_at: string;
}

const UserProfile = ({ userId, isCurrentUser = false }: UserProfileProps) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [likedCampaigns, setLikedCampaigns] = useState<Campaign[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    organization_name: '',
    bio: '',
    social_accounts: {} as Record<string, string>
  });

  useEffect(() => {
    getCurrentUser();
    fetchProfile();
    fetchSocialAccounts();
    fetchAchievements();
    fetchCampaigns();
    fetchLikedCampaigns();
    fetchFollowStats();
    if (!isCurrentUser) {
      checkFollowStatus();
    }
  }, [userId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      
      if (isCurrentUser) {
        setEditForm({
          full_name: data.full_name || '',
          organization_name: data.organization_name || '',
          bio: '', // Add bio to users table if needed
          social_accounts: {}
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_social_accounts')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setSocialAccounts(data || []);
      
      if (isCurrentUser) {
        const socialMap = (data || []).reduce((acc, account) => {
          acc[account.platform] = account.username;
          return acc;
        }, {} as Record<string, string>);
        
        setEditForm(prev => ({ ...prev, social_accounts: socialMap }));
      }
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    }
  };

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('organizer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchLikedCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_likes')
        .select(`
          campaigns (
            id,
            title,
            description,
            image_url,
            current_amount_cents,
            funding_goal_cents,
            slug,
            status,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setLikedCampaigns(data?.map(item => item.campaigns).filter(Boolean) || []);
    } catch (error) {
      console.error('Error fetching liked campaigns:', error);
    }
  };

  const fetchFollowStats = async () => {
    try {
      const [followersResult, followingResult] = await Promise.all([
        supabase
          .from('user_follows')
          .select('id', { count: 'exact' })
          .eq('following_id', userId),
        supabase
          .from('user_follows')
          .select('id', { count: 'exact' })
          .eq('follower_id', userId)
      ]);

      setFollowers(followersResult.count || 0);
      setFollowing(followingResult.count || 0);
    } catch (error) {
      console.error('Error fetching follow stats:', error);
    }
  };

  const checkFollowStatus = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .single();

      setIsFollowing(!!data);
    } catch (error) {
      // Not following if no record found
      setIsFollowing(false);
    }
  };

  const toggleFollow = async () => {
    if (!currentUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId);

        if (error) throw error;
        setIsFollowing(false);
        setFollowers(prev => prev - 1);
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowers(prev => prev + 1);

        // Create activity
        await supabase.from('user_activities').insert({
          user_id: currentUser.id,
          activity_type: 'user_followed',
          target_user_id: userId
        });
      }

      toast({
        title: isFollowing ? "Unfollowed" : "Following",
        description: `You are ${isFollowing ? 'no longer following' : 'now following'} ${profile?.full_name}`,
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    }
  };

  const saveProfile = async () => {
    try {
      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: editForm.full_name,
          organization_name: editForm.organization_name,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update social accounts
      await supabase
        .from('user_social_accounts')
        .delete()
        .eq('user_id', userId);

      const socialAccountsToInsert = Object.entries(editForm.social_accounts)
        .filter(([_, username]) => username.trim())
        .map(([platform, username]) => ({
          user_id: userId,
          platform,
          username: username.trim(),
          url: getSocialUrl(platform, username.trim())
        }));

      if (socialAccountsToInsert.length > 0) {
        const { error: socialError } = await supabase
          .from('user_social_accounts')
          .insert(socialAccountsToInsert);

        if (socialError) throw socialError;
      }

      await fetchProfile();
      await fetchSocialAccounts();
      setEditDialogOpen(false);
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const getSocialUrl = (platform: string, username: string): string => {
    const urls = {
      twitter: `https://twitter.com/${username}`,
      instagram: `https://instagram.com/${username}`,
      linkedin: `https://linkedin.com/in/${username}`,
      facebook: `https://facebook.com/${username}`,
      website: username.startsWith('http') ? username : `https://${username}`
    };
    return urls[platform as keyof typeof urls] || username;
  };

  const getSocialIcon = (platform: string) => {
    const icons = {
      twitter: <Twitter className="h-4 w-4" />,
      instagram: <Instagram className="h-4 w-4" />,
      linkedin: <Linkedin className="h-4 w-4" />,
      facebook: <Facebook className="h-4 w-4" />,
      website: <Globe className="h-4 w-4" />
    };
    return icons[platform as keyof typeof icons] || <LinkIcon className="h-4 w-4" />;
  };

  const getAchievementIcon = (type: string) => {
    const icons = {
      first_campaign: '🚀',
      first_donation: '💝',
      super_backer: '⭐',
      campaign_creator: '🎯',
      community_builder: '👥'
    };
    return icons[type as keyof typeof icons] || '🏆';
  };

  const getAchievementTitle = (type: string) => {
    const titles = {
      first_campaign: 'First Campaign',
      first_donation: 'First Donation',
      super_backer: 'Super Backer',
      campaign_creator: 'Campaign Creator',
      community_builder: 'Community Builder'
    };
    return titles[type as keyof typeof titles] || 'Achievement';
  };

  const shareProfile = async () => {
    const profileUrl = `${window.location.origin}/profile/${userId}`;
    try {
      await navigator.share({
        title: `${profile?.full_name}'s Profile`,
        text: `Check out ${profile?.full_name}'s profile and campaigns`,
        url: profileUrl,
      });
    } catch (error) {
      navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Link copied!",
        description: "Profile link has been copied to your clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-8 text-center">
        <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">User not found</h1>
        <p className="text-muted-foreground">This user profile doesn't exist or is private.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row items-start gap-8">
            <div className="flex flex-col items-center text-center lg:text-left">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={`https://avatar.vercel.sh/${profile.id}`} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary-glow text-white">
                  {profile.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-2 mb-4">
                <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                {profile.organization_name && (
                  <p className="text-lg text-muted-foreground">{profile.organization_name}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}</span>
                  </div>
                </div>
              </div>

              {/* Follow/Edit Buttons */}
              <div className="flex gap-2">
                {isCurrentUser ? (
                  <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="full_name">Full Name</Label>
                          <Input
                            id="full_name"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="organization">Organization (Optional)</Label>
                          <Input
                            id="organization"
                            value={editForm.organization_name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, organization_name: e.target.value }))}
                          />
                        </div>

                        <Separator />
                        <div className="space-y-3">
                          <Label>Social Media Links</Label>
                          {['twitter', 'instagram', 'linkedin', 'facebook', 'website'].map(platform => (
                            <div key={platform} className="flex items-center gap-2">
                              {getSocialIcon(platform)}
                              <Input
                                placeholder={`@${platform === 'website' ? 'yoursite.com' : 'username'}`}
                                value={editForm.social_accounts[platform] || ''}
                                onChange={(e) => setEditForm(prev => ({
                                  ...prev,
                                  social_accounts: {
                                    ...prev.social_accounts,
                                    [platform]: e.target.value
                                  }
                                }))}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={saveProfile}>
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <>
                    <Button onClick={toggleFollow} className={isFollowing ? "bg-muted text-muted-foreground" : ""}>
                      {isFollowing ? (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Follow
                        </>
                      )}
                    </Button>
                    <Button variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={shareProfile}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">{campaigns.length}</div>
                  <div className="text-sm text-muted-foreground">Campaigns</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">{followers}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">{following}</div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold">{achievements.length}</div>
                  <div className="text-sm text-muted-foreground">Achievements</div>
                </Card>
              </div>

              {/* Social Links */}
              {socialAccounts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Connect</h3>
                  <div className="flex flex-wrap gap-2">
                    {socialAccounts.map(account => (
                      <Button
                        key={account.platform}
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={account.url || getSocialUrl(account.platform, account.username)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2"
                        >
                          {getSocialIcon(account.platform)}
                          <span className="capitalize">{account.platform}</span>
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {achievements.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Achievements</h3>
                  <div className="flex flex-wrap gap-2">
                    {achievements.map(achievement => (
                      <Badge key={achievement.achievement_type} variant="secondary" className="text-sm">
                        <span className="mr-1">{getAchievementIcon(achievement.achievement_type)}</span>
                        {getAchievementTitle(achievement.achievement_type)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
          {(isCurrentUser || likedCampaigns.length > 0) && (
            <TabsTrigger value="liked">Liked ({likedCampaigns.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
          {campaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground">
                {isCurrentUser ? "Start your first campaign to share your ideas with the world!" : "This user hasn't created any campaigns yet."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map(campaign => (
                <CampaignCard 
                  key={campaign.id}
                  id={campaign.id}
                  title={campaign.title}
                  description={campaign.description}
                  image={campaign.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=450&fit=crop&crop=entropy&auto=format'}
                  category="Campaign"
                  currentAmount={(campaign.current_amount_cents || 0) / 100}
                  targetAmount={(campaign.funding_goal_cents || 0) / 100}
                  backers={0}
                  daysLeft={30}
                  creatorName={profile?.full_name || 'Anonymous'}
                  slug={campaign.slug}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="liked" className="space-y-6">
          {likedCampaigns.length === 0 ? (
            <Card className="p-12 text-center">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No liked campaigns</h3>
              <p className="text-muted-foreground">
                {isCurrentUser ? "Start exploring campaigns to find projects you love!" : "This user hasn't liked any campaigns yet."}
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {likedCampaigns.map(campaign => (
                <CampaignCard 
                  key={campaign.id}
                  id={campaign.id}
                  title={campaign.title}
                  description={campaign.description}
                  image={campaign.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=450&fit=crop&crop=entropy&auto=format'}
                  category="Campaign"
                  currentAmount={(campaign.current_amount_cents || 0) / 100}
                  targetAmount={(campaign.funding_goal_cents || 0) / 100}
                  backers={0}
                  daysLeft={30}
                  creatorName="Anonymous"
                  slug={campaign.slug}
                  isLiked={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserProfile;