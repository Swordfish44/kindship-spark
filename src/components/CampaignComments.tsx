import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Reply, Heart, Send, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  parent_comment_id?: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  replies?: Comment[];
  likes_count?: number;
  is_liked?: boolean;
}

interface CampaignCommentsProps {
  campaignId: string;
}

const CampaignComments = ({ campaignId }: CampaignCommentsProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
    getCurrentUser();
  }, [campaignId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_comments')
        .select(`
          *,
          user:users!user_id (
            id,
            full_name,
            email
          )
        `)
        .eq('campaign_id', campaignId)
        .is('parent_comment_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies, error: repliesError } = await supabase
            .from('campaign_comments')
            .select(`
              *,
              user:users!user_id (
                id,
                full_name,
                email
              )
            `)
            .eq('parent_comment_id', comment.id)
            .order('created_at', { ascending: true });

          if (repliesError) throw repliesError;

          return {
            ...comment,
            replies: replies || []
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Failed to load comments",
        description: "Unable to fetch comments. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave a comment.",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('campaign_comments')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully.",
      });
      
      // Refresh comments
      await fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Failed to post comment",
        description: "Unable to post your comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!user) return;
    if (!replyContent.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('campaign_comments')
        .insert({
          campaign_id: campaignId,
          user_id: user.id,
          content: replyContent.trim(),
          parent_comment_id: parentId,
        });

      if (error) throw error;

      setReplyContent('');
      setReplyTo(null);
      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully.",
      });
      
      // Refresh comments
      await fetchComments();
    } catch (error) {
      console.error('Error posting reply:', error);
      toast({
        title: "Failed to post reply",
        description: "Unable to post your reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const editComment = async (commentId: string) => {
    if (!editContent.trim()) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('campaign_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId);

      if (error) throw error;

      setEditingComment(null);
      setEditContent('');
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
      });
      
      await fetchComments();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Failed to update comment",
        description: "Unable to update your comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-12 pl-4 border-l-2 border-muted' : ''} animate-fade-in`}>
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8 hover-scale">
          <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary-glow text-white">
            {getInitials(comment.user.full_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{comment.user.full_name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.created_at)}
              </span>
              {comment.updated_at !== comment.created_at && (
                <Badge variant="outline" className="text-xs px-1 py-0">
                  edited
                </Badge>
              )}
            </div>
            {user?.id === comment.user_id && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditContent(comment.content);
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          
          {editingComment === comment.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => editComment(comment.id)}
                  disabled={!editContent.trim() || submitting}
                >
                  <Send className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {comment.content}
            </p>
          )}
          
          <div className="flex items-center space-x-4">
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-xs h-auto p-1 hover:bg-muted/50 transition-colors"
              >
                <Reply className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {replyTo === comment.id && (
            <div className="mt-3 space-y-2 animate-scale-in">
              <Textarea
                placeholder="Write a thoughtful reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px] focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => submitReply(comment.id)}
                  disabled={!replyContent.trim() || submitting}
                >
                  <Send className="h-3 w-3 mr-1" />
                  {submitting ? 'Posting...' : 'Post Reply'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setReplyTo(null);
                    setReplyContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Replies */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-4">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply={true} />
          ))}
        </div>
      )}
    </div>
  );

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Discussion</h2>
            <p className="text-sm text-muted-foreground">
              {comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)} comments
            </p>
          </div>
        </div>
      </div>

      {/* New Comment Form */}
      <Card className="p-6 hover:shadow-md transition-shadow">
        <div className="space-y-4">
          {user && (
            <div className="flex items-center space-x-3 mb-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-white text-xs">
                  {getInitials(user.user_metadata?.full_name || user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">Share your thoughts</span>
            </div>
          )}
          
          <Textarea
            placeholder={user ? "What do you think about this campaign? Share your support, questions, or feedback..." : "Please sign in to join the conversation"}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[120px] focus:ring-2 focus:ring-primary/20 transition-all"
            disabled={!user}
          />
          
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {!user ? 'Sign in to participate in the discussion' : 'Be respectful and constructive in your comments'}
              </span>
            </div>
            <Button
              onClick={submitComment}
              disabled={!newComment.trim() || submitting || !user}
              className="hover-scale"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-6">
              <MessageCircle className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Start the conversation</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Be the first to share your thoughts, ask questions, or show support for this campaign!
            </p>
            {!user && (
              <Button variant="outline" className="mt-4" asChild>
                <a href="/auth">Sign in to comment</a>
              </Button>
            )}
          </Card>
        ) : (
          comments.map((comment, index) => (
            <Card key={comment.id} className="p-6 group hover:shadow-md transition-all hover:bg-muted/20">
              <CommentItem comment={comment} />
              {index < comments.length - 1 && <Separator className="mt-6" />}
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CampaignComments;