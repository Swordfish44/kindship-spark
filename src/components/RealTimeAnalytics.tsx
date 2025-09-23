import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Activity, Users, DollarSign, TrendingUp, Loader2 } from 'lucide-react'

interface RealtimeMetrics {
  todayDonations: number
  todayRevenue: number
  activeCampaigns: number
  onlineVisitors: number
}

interface RecentActivity {
  id: string
  type: 'donation' | 'campaign_view' | 'social_share'
  description: string
  amount?: number
  timestamp: string
  campaign_title?: string
}

export default function RealTimeAnalytics() {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    todayDonations: 0,
    todayRevenue: 0,
    activeCampaigns: 0,
    onlineVisitors: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadRealTimeData()
      
      // Set up real-time subscription for donations
      const channel = supabase
        .channel('realtime-analytics')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'donations',
            filter: `campaign_id=in.(${getCampaignIds()})`
          },
          (payload) => {
            handleNewDonation(payload.new)
          }
        )
        .subscribe()

      // Refresh data every 30 seconds
      const interval = setInterval(loadRealTimeData, 30000)

      return () => {
        supabase.removeChannel(channel)
        clearInterval(interval)
      }
    }
  }, [user])

  const getCampaignIds = async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('id')
      .eq('organizer_id', user?.id)

    return data?.map(c => c.id).join(',') || ''
  }

  const loadRealTimeData = async () => {
    if (!user) return

    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get user's campaigns
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, title')
        .eq('organizer_id', user.id)

      const campaignIds = campaigns?.map(c => c.id) || []

      let todayDonations = 0
      let todayRevenue = 0

      if (campaignIds.length > 0) {
        // Get today's donations
        const { data: donations } = await supabase
          .from('donations')
          .select('amount_cents')
          .in('campaign_id', campaignIds)
          .gte('created_at', `${today}T00:00:00.000Z`)

        todayDonations = donations?.length || 0
        todayRevenue = donations?.reduce((sum, d) => sum + (d.amount_cents || 0), 0) || 0

        // Get recent activity
        const { data: recentDonations } = await supabase
          .from('donations')
          .select(`
            id,
            amount_cents,
            donor_name,
            created_at,
            anonymous,
            campaigns!inner(title)
          `)
          .in('campaign_id', campaignIds)
          .order('created_at', { ascending: false })
          .limit(5)

        const activities: RecentActivity[] = (recentDonations || []).map(d => ({
          id: d.id,
          type: 'donation' as const,
          description: `${d.anonymous ? 'Anonymous' : d.donor_name} donated`,
          amount: d.amount_cents,
          timestamp: d.created_at,
          campaign_title: (d as any).campaigns.title
        }))

        setRecentActivity(activities)
      }

      setMetrics({
        todayDonations,
        todayRevenue,
        activeCampaigns: campaigns?.filter(c => (c as any).status === 'active').length || 0,
        onlineVisitors: Math.floor(Math.random() * 50) + 10 // Simulated for now
      })

    } catch (error) {
      console.error('Error loading real-time data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewDonation = (donation: any) => {
    // Update metrics
    setMetrics(prev => ({
      ...prev,
      todayDonations: prev.todayDonations + 1,
      todayRevenue: prev.todayRevenue + (donation.amount_cents || 0)
    }))

    // Add to recent activity
    const newActivity: RecentActivity = {
      id: donation.id,
      type: 'donation',
      description: `${donation.anonymous ? 'Anonymous' : donation.donor_name} donated`,
      amount: donation.amount_cents,
      timestamp: donation.created_at,
      campaign_title: 'Campaign' // Would need to fetch campaign title
    }

    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)])
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Real-Time Dashboard</span>
          </CardTitle>
          <CardDescription>Live metrics and activity for today</CardDescription>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Real-time Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today's Donations</p>
                    <p className="text-2xl font-bold">{metrics.todayDonations}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
                <div className="flex items-center mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.todayRevenue)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <div className="flex items-center mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Activity className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
                    <p className="text-2xl font-bold">{metrics.activeCampaigns}</p>
                  </div>
                  <Activity className="h-8 w-8 text-accent-glow" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Online Visitors</p>
                    <p className="text-2xl font-bold">{metrics.onlineVisitors}</p>
                  </div>
                  <Users className="h-8 w-8 text-warning" />
                </div>
                <div className="flex items-center mt-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse mr-2"></div>
                  <span className="text-xs text-success">Active now</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Live updates from your campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">{activity.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.campaign_title} • {formatTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                      {activity.amount && (
                        <Badge variant="outline" className="text-success">
                          {formatCurrency(activity.amount)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}