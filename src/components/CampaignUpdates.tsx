import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Clock, Flag, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CampaignUpdate {
  id: string;
  title: string;
  content: string;
  update_type: 'general' | 'milestone' | 'delay' | 'completion';
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface CampaignUpdatesProps {
  campaignId: string;
  isOwner?: boolean;
}

const CampaignUpdates = ({ campaignId, isOwner = false }: CampaignUpdatesProps) => {
  const [updates, setUpdates] = useState<CampaignUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUpdates();
  }, [campaignId]);

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_updates')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUpdates((data || []).map(update => ({
        ...update,
        update_type: update.update_type as 'general' | 'milestone' | 'delay' | 'completion'
      })));
    } catch (error) {
      console.error('Error fetching updates:', error);
      toast({
        title: "Failed to load updates",
        description: "Unable to fetch campaign updates. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'milestone':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'delay':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'completion':
        return <Flag className="h-5 w-5 text-blue-600" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getUpdateBadgeVariant = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'default';
      case 'delay':
        return 'secondary';
      case 'completion':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getUpdateTypeLabel = (type: string) => {
    switch (type) {
      case 'milestone':
        return 'Milestone';
      case 'delay':
        return 'Delay Notice';
      case 'completion':
        return 'Project Complete';
      default:
        return 'Update';
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (updates.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-medium mb-2">No Updates Yet</h3>
          <p className="text-sm">
            {isOwner 
              ? 'Share updates with your backers to keep them engaged!'
              : 'The campaign organizer hasn\'t posted any updates yet.'
            }
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Campaign Updates</h2>
        {isOwner && (
          <Button>Post Update</Button>
        )}
      </div>

      <div className="space-y-6">
        {updates.map((update, index) => (
          <Card key={update.id} className="p-6">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getUpdateIcon(update.update_type)}
                  <div>
                    <h3 className="font-semibold text-lg">{update.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(update.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <Badge variant={getUpdateBadgeVariant(update.update_type)}>
                  {getUpdateTypeLabel(update.update_type)}
                </Badge>
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground whitespace-pre-wrap">{update.content}</p>
              </div>

              {/* Separator (except for last item) */}
              {index < updates.length - 1 && <Separator className="mt-6" />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CampaignUpdates;