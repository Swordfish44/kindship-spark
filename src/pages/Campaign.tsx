import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import DonateWidget from '@/components/DonateWidget'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { money } from '@/lib/utils'

export default function Campaign() {
  const { slug } = useParams()
  const [campaign, setCampaign] = useState<any>(null)
  const [stats, setStats] = useState<{ raised_cents: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const checkoutEndpoint = 'https://uobgytlnzmngwxmweufu.functions.supabase.co/create-checkout'

  useEffect(() => {
    if (!slug) return
    ;(async () => {
      setLoading(true)
      const { data: camp } = await supabase
        .from('campaigns')
        .select('id, title, description, image_url, funding_goal_cents, status, slug')
        .eq('slug', slug)
        .maybeSingle()
      setCampaign(camp)
      const { data: s } = await supabase.rpc('public_campaign_stats', { sl: slug })
      if (s && s.length) setStats({ raised_cents: Number(s[0].raised_cents || 0) })
      setLoading(false)
    })()
  }, [slug])

  const progress = useMemo(() => {
    if (!campaign) return 0
    const raised = stats?.raised_cents || 0
    const goal = Math.max(1, Number(campaign.funding_goal_cents || 0))
    return Math.min(100, Math.round((raised / goal) * 100))
  }, [campaign, stats])

  if (loading) return <main className="page"><div className="container-nbt py-10">Loading…</div></main>
  if (!campaign || campaign.status !== 'active') return <main className="page"><div className="container-nbt py-10"><h1>Campaign not available</h1></div></main>

  return (
    <main className="page">
      <div className="container-nbt py-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <img src={campaign.image_url || 'https://picsum.photos/1200/600'} alt="hero" className="w-full rounded-2xl object-cover aspect-[16/9]" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{campaign.title}</h1>
          <div className="mt-3"><Progress value={progress} /></div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
            <strong>{money(stats?.raised_cents || 0, 'USD')}</strong>
            <span>raised of {money(campaign.funding_goal_cents || 0, 'USD')} goal</span>
            <span>· {progress}%</span>
          </div>
          <article className="prose mt-4 max-w-none">{campaign.description}</article>
          <div className="mt-4 flex gap-3 text-sm">
            <Button variant="outline" asChild><a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Support this campaign: ' + window.location.href)}`} target="_blank">Share on X</a></Button>
            <Button variant="outline" asChild><a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank">Share on Facebook</a></Button>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy Link</Button>
          </div>
        </section>
        <aside>
          <Card>
            <CardContent className="p-4 sm:p-6">
              <DonateWidget
                checkoutEndpoint={checkoutEndpoint}
                campaignSlug={slug!}
                currency='USD'
                amounts={[2500, 5000, 10000, 25000]}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  )
}