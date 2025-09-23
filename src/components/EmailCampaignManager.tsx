import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { 
  Mail, 
  Send, 
  FileText, 
  Calendar, 
  Users, 
  Loader2,
  Plus,
  Eye
} from 'lucide-react'
import RichTextEditor from '@/components/RichTextEditor'

interface EmailCampaign {
  id: string
  name: string
  subject: string
  content: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled'
  scheduled_at?: string
  sent_at?: string
  created_at: string
  target_audience?: any
  template_id?: string
  updated_at?: string
  created_by?: string
}

export default function EmailCampaignManager() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
  })
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadCampaigns()
    }
  }, [user])

  const loadCampaigns = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCampaigns((data || []) as EmailCampaign[])
    } catch (error) {
      console.error('Error loading email campaigns:', error)
      toast({
        title: 'Error',
        description: 'Failed to load email campaigns',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const createCampaign = async () => {
    if (!user || !formData.name || !formData.subject || !formData.content) return

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert([{
          name: formData.name,
          subject: formData.subject,
          content: formData.content,
          created_by: user.id,
          status: 'draft',
        }])
        .select()
        .single()

      if (error) throw error

      setCampaigns(prev => [data as EmailCampaign, ...prev])
      setFormData({ name: '', subject: '', content: '' })
      setShowForm(false)
      
      toast({
        title: 'Campaign created',
        description: 'Your email campaign has been saved as a draft.',
      })
    } catch (error) {
      console.error('Error creating email campaign:', error)
      toast({
        title: 'Error',
        description: 'Failed to create email campaign',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const sendCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to send this campaign to all subscribers?')) {
      return
    }

    try {
      // Update campaign status
      const { error: updateError } = await supabase
        .from('email_campaigns')
        .update({ 
          status: 'sending',
          sent_at: new Date().toISOString() 
        })
        .eq('id', campaignId)

      if (updateError) throw updateError

      // Send campaign via edge function
      const response = await fetch(`https://uobgytlnzmngwxmweufu.functions.supabase.co/send-marketing-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYmd5dGxuem1uZ3d4bXdldWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTA4OTIsImV4cCI6MjA3NDEyNjg5Mn0.7hm6Vzmj1L131GOVOpA2iH7Rka5hsyb9XfSRwSa-2aA`,
        },
        body: JSON.stringify({ campaignId }),
      })

      if (!response.ok) {
        throw new Error('Failed to send campaign')
      }

      // Update local state
      setCampaigns(prev =>
        prev.map(c =>
          c.id === campaignId
            ? { ...c, status: 'sent' as const, sent_at: new Date().toISOString() }
            : c
        )
      )

      toast({
        title: 'Campaign sent',
        description: 'Your email campaign has been sent to all subscribers.',
      })
    } catch (error) {
      console.error('Error sending campaign:', error)
      toast({
        title: 'Error',
        description: 'Failed to send email campaign',
        variant: 'destructive',
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="h-4 w-4" />
      case 'scheduled':
        return <Calendar className="h-4 w-4" />
      case 'sending':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'sent':
        return <Send className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'
      case 'scheduled':
        return 'default'
      case 'sending':
        return 'default'
      case 'sent':
        return 'success'
      default:
        return 'secondary'
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Please sign in to manage email campaigns.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Email Campaigns</span>
              </CardTitle>
              <CardDescription>
                Create and manage marketing email campaigns for your platform.
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Email Campaign</CardTitle>
            <CardDescription>
              Design and create a new marketing email campaign.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Internal name for this campaign"
              />
            </div>
            
            <div>
              <Label htmlFor="campaign-subject">Email Subject</Label>
              <Input
                id="campaign-subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Subject line for the email"
              />
            </div>
            
            <div>
              <RichTextEditor
                value={formData.content}
                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                label="Email Content"
                placeholder="Write your email content here..."
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={createCampaign} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save as Draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-muted-foreground">Loading campaigns...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No email campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first email campaign to reach your audience.
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <Badge variant={getStatusColor(campaign.status) as any}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(campaign.status)}
                          <span className="capitalize">{campaign.status}</span>
                        </div>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong>Subject:</strong> {campaign.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(campaign.created_at).toLocaleDateString()}
                      {campaign.sent_at && (
                        <span> • Sent {new Date(campaign.sent_at).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                    {campaign.status === 'draft' && (
                      <Button 
                        size="sm"
                        onClick={() => sendCampaign(campaign.id)}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}