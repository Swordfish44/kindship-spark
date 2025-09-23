import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Eye,
  Share2,
  Calendar,
  Target,
  Activity,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface PerformanceMetrics {
  total_raised_cents: number
  total_donations: number
  unique_donors: number
  avg_donation_cents: number
  conversion_rate: number
  page_views: number
  social_shares: number
  growth_rate: number
  best_performing_day: string
  worst_performing_day: string
}

interface DailyData {
  date: string
  donations: number
  amount: number
  page_views: number
  conversion_rate: number
}

interface BackerInsight {
  email: string
  total_donated_cents: number
  campaigns_supported: number
  donation_frequency: string
  engagement_score: number
  preferred_categories: string[]
  first_donation_date: string
  last_donation_date: string
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent-glow))', 'hsl(var(--warning))', 'hsl(var(--success))']

export default function AnalyticsOverview() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [timeframe, setTimeframe] = useState('30')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [backerInsights, setBackerInsights] = useState<BackerInsight[]>([])
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadCampaigns()
    }
  }, [user])

  useEffect(() => {
    if (selectedCampaign && timeframe) {
      loadAnalyticsData()
    }
  }, [selectedCampaign, timeframe])

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, slug, status')
        .eq('organizer_id', user?.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      setCampaigns(data || [])
      if (data && data.length > 0) {
        setSelectedCampaign(data[0].id)
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
      toast({
        title: 'Error',
        description: 'Failed to load campaigns',
        variant: 'destructive',
      })
    }
  }

  const loadAnalyticsData = async () => {
    if (!selectedCampaign) return

    setLoading(true)
    try {
      // Load performance summary
      const { data: performanceData, error: performanceError } = await supabase
        .rpc('get_campaign_performance_summary', {
          p_campaign_id: selectedCampaign,
          p_days: parseInt(timeframe)
        })

      if (performanceError) throw performanceError
      if (performanceData && performanceData.length > 0) {
        setMetrics(performanceData[0])
      }

      // Load daily analytics data
      const { data: dailyAnalytics, error: dailyError } = await supabase
        .from('donation_analytics')
        .select(`
          recorded_date,
          total_donations_count,
          total_amount_cents,
          campaign_analytics!inner(page_views, conversion_rate)
        `)
        .eq('campaign_id', selectedCampaign)
        .gte('recorded_date', new Date(Date.now() - parseInt(timeframe) * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('recorded_date', { ascending: true })

      if (dailyError) throw dailyError

      const formattedDailyData = (dailyAnalytics || []).map((item: any) => ({
        date: new Date(item.recorded_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        donations: item.total_donations_count || 0,
        amount: (item.total_amount_cents || 0) / 100,
        page_views: item.campaign_analytics?.page_views || 0,
        conversion_rate: item.campaign_analytics?.conversion_rate || 0,
      }))

      setDailyData(formattedDailyData)

      // Load backer insights - simplified query
      const { data: donations } = await supabase
        .from('donations')
        .select('donor_email')
        .eq('campaign_id', selectedCampaign)
        .not('donor_email', 'is', null)

      const emails = donations?.map(d => d.donor_email) || []

      if (emails.length > 0) {
        const { data: backerData, error: backerError } = await supabase
          .from('backer_insights')
          .select('*')
          .in('email', emails)
          .order('engagement_score', { ascending: false })
          .limit(10)

        if (backerError) throw backerError
        setBackerInsights((backerData || []) as BackerInsight[])
      }

    } catch (error) {
      console.error('Error loading analytics data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadAnalyticsData()
    setRefreshing(false)
    toast({
      title: 'Data refreshed',
      description: 'Analytics data has been updated with the latest information.',
    })
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'frequent': return 'hsl(var(--success))'
      case 'regular': return 'hsl(var(--primary))'
      case 'occasional': return 'hsl(var(--warning))'
      default: return 'hsl(var(--muted-foreground))'
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Please sign in to view analytics.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Campaigns</h3>
            <p className="text-muted-foreground">
              Create an active campaign to start viewing analytics.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Campaign Analytics</span>
              </CardTitle>
              <CardDescription>
                Detailed performance metrics and backer insights
              </CardDescription>
            </div>
            <Button onClick={refreshData} disabled={refreshing} variant="outline" size="sm">
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Campaign</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded mb-4"></div>
                  <div className="h-32 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : metrics ? (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="relative overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Raised</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.total_raised_cents)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-success" />
                </div>
                <div className="flex items-center mt-2">
                  {metrics.growth_rate > 0 ? (
                    <TrendingUp className="h-4 w-4 text-success mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive mr-1" />
                  )}
                  <span className={`text-xs ${metrics.growth_rate > 0 ? 'text-success' : 'text-destructive'}`}>
                    {Math.abs(metrics.growth_rate).toFixed(1)}% vs last period
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Donations</p>
                    <p className="text-2xl font-bold">{formatNumber(metrics.total_donations)}</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatNumber(metrics.unique_donors)} unique donors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Donation</p>
                    <p className="text-2xl font-bold">{formatCurrency(metrics.avg_donation_cents)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent-glow" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Conversion rate: {metrics.conversion_rate.toFixed(2)}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Page Views</p>
                    <p className="text-2xl font-bold">{formatNumber(metrics.page_views)}</p>
                  </div>
                  <Eye className="h-8 w-8 text-warning" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatNumber(metrics.social_shares)} social shares
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donations Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Donations Over Time</CardTitle>
                <CardDescription>Daily donation count and amount</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="donations" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Donations"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue with area chart</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`$${value}`, 'Revenue']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="hsl(var(--success))" 
                      fill="hsl(var(--success) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Page Views vs Conversions */}
          <Card>
            <CardHeader>
              <CardTitle>Traffic & Conversion Analysis</CardTitle>
              <CardDescription>Page views and conversion rate comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar yAxisId="left" dataKey="page_views" fill="hsl(var(--primary))" name="Page Views" />
                  <Line yAxisId="right" type="monotone" dataKey="conversion_rate" stroke="hsl(var(--warning))" name="Conversion Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Backer Insights */}
          {backerInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Backers Insights</CardTitle>
                <CardDescription>Your most engaged supporters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {backerInsights.slice(0, 5).map((backer, index) => (
                    <div key={backer.email} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{backer.email}</p>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <span>{formatCurrency(backer.total_donated_cents)}</span>
                              <span>•</span>
                              <span>{backer.campaigns_supported} campaigns</span>
                              <Badge 
                                variant="outline" 
                                style={{ color: getFrequencyColor(backer.donation_frequency) }}
                              >
                                {backer.donation_frequency}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">Engagement Score</div>
                        <div className="text-lg font-bold text-primary">{backer.engagement_score.toFixed(0)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
              <CardDescription>Key findings and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-success" />
                    <span className="font-medium text-success">Best Performing Day</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {metrics.best_performing_day 
                      ? new Date(metrics.best_performing_day).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'No data available'
                    }
                  </p>
                </div>
                
                {metrics.worst_performing_day && (
                  <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <Calendar className="h-4 w-4 text-warning" />
                      <span className="font-medium text-warning">Improvement Opportunity</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(metrics.worst_performing_day).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Analytics Data</h3>
              <p className="text-muted-foreground">
                Analytics data will appear here once your campaign receives donations and traffic.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}