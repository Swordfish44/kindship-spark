import React, { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Share2, Users, Target, Calendar } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Header from '@/components/Header'
import DonateWidget from '@/components/DonateWidget'

const checkoutEndpoint = 'https://uobgytlnzmngwxmweufu.functions.supabase.co/create-checkout'

function fmt(cents: number, currency = 'USD') { 
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency }) 
}

export default function Campaign() {
  const { slug } = useParams()
  const { toast } = useToast()
  const [campaign, setCampaign] = useState<any>(null)
  const [stats, setStats] = useState<{ raised_cents: number; backer_count: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    ;(async () => {
      setLoading(true)
      // fetch campaign
      const { data: camp, error } = await supabase
        .from('campaigns')
        .select(`
          id, 
          title, 
          description, 
          image_url, 
          funding_goal_cents, 
          status, 
          slug,
          created_at,
          users!organizer_id (full_name, organization_name),
          campaign_categories (name, color_hex)
        `)
        .eq('slug', slug)
        .single()
      
      if (error) { 
        console.error(error)
        toast({
          title: "Campaign not found",
          description: "The campaign you're looking for doesn't exist.",
          variant: "destructive",
        })
        setLoading(false)
        return 
      }
      setCampaign(camp)

      // public aggregated stats via RPC
      const { data: s } = await supabase.rpc('public_campaign_stats', { sl: slug })
      if (s && s.length) {
        setStats({ 
          raised_cents: Number(s[0].raised_cents || 0),
          backer_count: Number(s[0].backer_count || 0)
        })
      }
      setLoading(false)
    })()
  }, [slug])

  const progress = useMemo(() => {
    if (!campaign) return 0
    const raised = stats?.raised_cents || 0
    const goal = Math.max(1, Number(campaign.funding_goal_cents || 0))
    return Math.min(100, Math.round((raised / goal) * 100))
  }, [campaign, stats])

  const handleShare = async () => {
    try {
      await navigator.share({
        title: campaign.title,
        text: campaign.description,
        url: window.location.href,
      })
    } catch (error) {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied!",
        description: "Campaign link has been copied to your clipboard.",
      })
    }
  }

  const daysLeft = useMemo(() => {
    if (!campaign?.created_at) return 30
    const created = new Date(campaign.created_at)
    const now = new Date()
    const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, 30 - daysDiff) // Assuming 30-day campaigns
  }, [campaign?.created_at])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!campaign || campaign.status !== 'active') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Campaign not available</h1>
          <p className="text-muted-foreground mb-8">
            The campaign you're looking for doesn't exist or is not active.
          </p>
          <Button asChild>
            <Link to="/">Browse Campaigns</Link>
          </Button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-6" asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <section className="lg:col-span-2 space-y-6">
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
              
              <Button variant="outline" size="sm" onClick={handleShare} className="mb-6">
                <Share2 className="mr-2 h-4 w-4" />
                Share Campaign
              </Button>

              {campaign.image_url && (
                <img
                  src={campaign.image_url}
                  alt={campaign.title}
                  className="w-full h-64 lg:h-80 object-cover rounded-lg mb-6"
                />
              )}
            </div>

            {/* Progress Bar */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full progress-gradient transition-all duration-500 ease-out rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Target className="h-4 w-4 text-primary" />
                        <strong>{fmt(stats?.raised_cents || 0)}</strong>
                        <span className="text-muted-foreground">
                          raised of {fmt(campaign.funding_goal_cents || 0)} goal
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-primary" />
                        <span><strong>{stats?.backer_count || 0}</strong> backers</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span><strong>{daysLeft}</strong> days left</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Story */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">About this campaign</h2>
                <div className="prose max-w-none">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    {campaign.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Social Sharing */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-3">Help spread the word</h3>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Support this campaign: ' + window.location.href)}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Share on X
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Share on Facebook
                    </a>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href)
                      toast({ title: "Link copied to clipboard!" })
                    }}
                  >
                    Copy Link
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Donation Sidebar */}
          <aside>
            <DonateWidget
              checkoutEndpoint={checkoutEndpoint}
              campaignSlug={slug!}
              currency="USD"
              amounts={[2500, 5000, 10000, 25000]}
            />
          </aside>
        </div>
      </main>
    </div>
  )
}