import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, Flag, CheckCircle, AlertTriangle, Plus, Send, Megaphone } from 'lucide-react';
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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    update_type: 'general' as 'general' | 'milestone' | 'delay' | 'completion',
    is_public: true
  });
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

  const createUpdate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Please fill in all fields",
        description: "Title and content are required.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('campaign_updates')
        .insert({
          campaign_id: campaignId,
          title: formData.title.trim(),
          content: formData.content.trim(),
          update_type: formData.update_type,
          is_public: formData.is_public,
        });

      if (error) throw error;

      setFormData({
        title: '',
        content: '',
        update_type: 'general',
        is_public: true
      });
      setShowCreateForm(false);
      
      toast({
        title: "Update posted!",
        description: "Your campaign update has been published successfully.",
      });
      
      await fetchUpdates();
    } catch (error) {
      console.error('Error creating update:', error);
      toast({
        title: "Failed to post update",
        description: "Unable to post your update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Campaign Updates</h2>
              <p className="text-sm text-muted-foreground">Latest news and progress</p>
            </div>
          </div>
          {isOwner && (
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button className="hover-scale">
                  <Plus className="h-4 w-4 mr-2" />
                  Post Update
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Campaign Update</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Update Title</Label>
                      <Input
                        id="title"
                        placeholder="Share exciting news or progress..."
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="type">Update Type</Label>
                      <Select 
                        value={formData.update_type} 
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, update_type: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>General Update</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="milestone">
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>Milestone Reached</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="delay">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span>Delay Notice</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="completion">
                            <div className="flex items-center space-x-2">
                              <Flag className="h-4 w-4 text-blue-600" />
                              <span>Project Complete</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="content">Update Content</Label>
                      <Textarea
                        id="content"
                        placeholder="Share details about your progress, challenges overcome, next steps, or any exciting developments..."
                        value={formData.content}
                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                        className="mt-1 min-h-[120px]"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="public"
                        checked={formData.is_public}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                      />
                      <Label htmlFor="public">Make this update public</Label>
                      <span className="text-xs text-muted-foreground ml-2">
                        (Public updates are visible to everyone, private updates only to backers)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowCreateForm(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={createUpdate}
                      disabled={submitting || !formData.title.trim() || !formData.content.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {submitting ? 'Publishing...' : 'Publish Update'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card className="p-12 text-center">
          <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-6">
            <Megaphone className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No updates yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isOwner 
              ? 'Keep your backers engaged by sharing progress updates, milestones, and behind-the-scenes content!'
              : 'The campaign organizer hasn\'t posted any updates yet. Check back soon for news and progress!'
            }
          </p>
          {isOwner && (
            <Button className="mt-6" onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Update
            </Button>
          )}
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Campaign Updates</h2>
            <p className="text-sm text-muted-foreground">{updates.length} updates posted</p>
          </div>
        </div>
        {isOwner && (
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="hover-scale">
                <Plus className="h-4 w-4 mr-2" />
                Post Update
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Campaign Update</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Update Title</Label>
                    <Input
                      id="title"
                      placeholder="Share exciting news or progress..."
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Update Type</Label>
                    <Select 
                      value={formData.update_type} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, update_type: value }))}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>General Update</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="milestone">
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>Milestone Reached</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="delay">
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span>Delay Notice</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="completion">
                          <div className="flex items-center space-x-2">
                            <Flag className="h-4 w-4 text-blue-600" />
                            <span>Project Complete</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="content">Update Content</Label>
                    <Textarea
                      id="content"
                      placeholder="Share details about your progress, challenges overcome, next steps, or any exciting developments..."
                      value={formData.content}
                      onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      className="mt-1 min-h-[120px]"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                    />
                    <Label htmlFor="public">Make this update public</Label>
                    <span className="text-xs text-muted-foreground ml-2">
                      (Public updates are visible to everyone, private updates only to backers)
                    </span>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowCreateForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={createUpdate}
                    disabled={submitting || !formData.title.trim() || !formData.content.trim()}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submitting ? 'Publishing...' : 'Publish Update'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {updates.map((update, index) => (
          <Card key={update.id} className="p-6 hover:shadow-md transition-all animate-fade-in">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {getUpdateIcon(update.update_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">{update.title}</h3>
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
                <div className="flex items-center space-x-2">
                  <Badge variant={getUpdateBadgeVariant(update.update_type)}>
                    {getUpdateTypeLabel(update.update_type)}
                  </Badge>
                  {!update.is_public && (
                    <Badge variant="outline">Private</Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {update.content}
                </p>
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