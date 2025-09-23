import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Heart, 
  Users, 
  Target, 
  Calendar, 
  TrendingUp,
  User,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface ActivityItem {
  id: string;
  user_id: string;
  activity_type: 'campaign_created' | 'campaign_backed' | 'campaign_liked' | 'user_followed';
  campaign_id?: string;
  target_user_id?: string;
  metadata: any;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    organization_name?: string;
  };
  campaign?: {
    id: string;
    title: string;
    slug: string;
    image_url?: string;
  };
  target_user?: {
    id: string;
    full_name: string;
  };
}

interface SocialActivityFeedProps {
  userId?: string; // If provided, shows activity from users this user follows
  showPublic?: boolean; // If true, shows public activity feed
}

const SocialActivityFeed = ({ userId, showPublic = false }: SocialActivityFeedProps) => {
  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    fetchActivities();
  }, [userId, showPublic]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchActivities = async () => {
    try {
      let query = supabase
        .from('user_activities')
        .select(`
          *,
          users!user_id(id, full_name, organization_name),
          campaigns(id, title, slug, image_url),
          users!target_user_id(id, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!showPublic && userId) {
        // Get activities from users that the current user follows
        const { data: followingData } = await supabase
          .from('user_follows')
          .select('following_id')
          .eq('follower_id', userId);

        const followingIds = followingData?.map(f => f.following_id) || [];
        if (followingIds.length === 0) {
          setActivities([]);
          setLoading(false);
          return;
        }

        query = query.in('user_id', followingIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Safely transform the data
      const transformedActivities: ActivityItem[] = [];
      
      if (data) {
        data.forEach((item: any) => {
          // Only include items with valid user data
          if (item.users && Array.isArray(item.users) && item.users.length > 0) {
            const user = item.users[0];
            if (user.id && user.full_name) {
              transformedActivities.push({
                ...item,
                user: {
                  id: user.id,
                  full_name: user.full_name,
                  organization_name: user.organization_name
                },
                campaign: item.campaigns?.[0] || null,
                target_user: item.users?.[1] || null
              });
            }
          }
        });
      }
      
      setActivities(transformedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast({
        title: "Error",
        description: "Failed to load activity feed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      campaign_created: <Target className="h-4 w-4 text-blue-500" />,
      campaign_backed: <Heart className="h-4 w-4 text-green-500" />,
      campaign_liked: <Heart className="h-4 w-4 text-red-500" />,
      user_followed: <Users className="h-4 w-4 text-purple-500" />
    };
    return icons[type as keyof typeof icons] || <Activity className="h-4 w-4" />;
  };

  const getActivityText = (activity: ActivityItem) => {
    const { activity_type, user, campaign, target_user } = activity;
    
    switch (activity_type) {
      case 'campaign_created':
        return (
          <>
            <strong>{user.full_name}</strong> created a new campaign{' '}
            {campaign && (
              <Link 
                to={`/campaign/${campaign.slug}`}
                className="text-primary hover:underline font-medium"
              >
                {campaign.title}
              </Link>
            )}
          </>
        );
      case 'campaign_backed':
        return (
          <>
            <strong>{user.full_name}</strong> backed{' '}
            {campaign && (
              <Link 
                to={`/campaign/${campaign.slug}`}
                className="text-primary hover:underline font-medium"
              >
                {campaign.title}
              </Link>
            )}
          </>
        );
      case 'campaign_liked':
        return (
          <>
            <strong>{user.full_name}</strong> liked{' '}
            {campaign && (
              <Link 
                to={`/campaign/${campaign.slug}`}
                className="text-primary hover:underline font-medium"
              >
                {campaign.title}
              </Link>
            )}
          </>
        );
      case 'user_followed':
        return (
          <>
            <strong>{user.full_name}</strong> started following{' '}
            {target_user && (
              <Link 
                to={`/profile/${target_user.id}`}
                className="text-primary hover:underline font-medium"
              >
                <strong>{target_user.full_name}</strong>
              </Link>
            )}
          </>
        );
      default:
        return <span>Unknown activity</span>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {showPublic ? 'Recent Activity' : 'Following Activity'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No activity yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {showPublic 
                ? "Be the first to create a campaign or back a project!" 
                : "Follow some users to see their activity here, or check out the public activity feed."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <div key={activity.id}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://avatar.vercel.sh/${activity.user.id}`} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white text-xs">
                      {activity.user.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      {getActivityIcon(activity.activity_type)}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">
                          {getActivityText(activity)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                          {activity.user.organization_name && (
                            <Badge variant="outline" className="text-xs">
                              {activity.user.organization_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Campaign Preview */}
                    {activity.campaign && (
                      <Link 
                        to={`/campaign/${activity.campaign.slug}`}
                        className="block mt-3"
                      >
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                          {activity.campaign.image_url && (
                            <img 
                              src={activity.campaign.image_url} 
                              alt={activity.campaign.title}
                              className="h-12 w-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {activity.campaign.title}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )}
                  </div>
                </div>
                
                {index < activities.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
            
            {activities.length === 50 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  Load More Activity
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialActivityFeed;