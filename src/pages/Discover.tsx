import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { centsToDisplay } from '@/lib/currency';
import Header from '@/components/Header';

type CampaignRow = {
  slug: string;
  title: string;
  description: string;
  image_url?: string;
  funding_goal_cents: number;
  currency: string;
  raised_cents: number;
  created_at: string;
}

export default function Discover() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'recent' | 'most_raised' | 'progress'>('recent')
  const [page, setPage] = useState(1)
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [loading, setLoading] = useState(true)

  async function loadCampaigns() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('public_discover_campaigns', {
        p_search: search || null,
        p_sort: sort,
        p_page: page,
        p_size: 24
      })

      if (error) {
        console.error('Error loading campaigns:', error)
      } else {
        setCampaigns(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [search, sort, page])

  const handleSearch = (value: string) => {
    setPage(1)
    setSearch(value)
  }

  const handleSort = (value: string) => {
    setPage(1)
    setSort(value as 'recent' | 'most_raised' | 'progress')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Discover Campaigns</h1>
          <p className="text-muted-foreground text-lg">
            Find and support amazing projects from creators around the world
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full"
            />
          </div>
          <Select value={sort} onValueChange={handleSort}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="most_raised">Most Raised</SelectItem>
              <SelectItem value="progress">Closest to Goal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Campaign Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-muted-foreground">Loading campaigns...</div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No campaigns found</p>
            {search && (
              <Button 
                variant="outline" 
                onClick={() => handleSearch('')}
                className="mt-4"
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {campaigns.map((campaign) => (
              <CampaignCard key={campaign.slug} campaign={campaign} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && campaigns.length > 0 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <div className="flex items-center px-4 py-2 bg-muted rounded">
              Page {page}
            </div>
            <Button
              variant="outline"
              onClick={() => setPage(p => p + 1)}
              disabled={campaigns.length < 24}
            >
              Next
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}

function CampaignCard({ campaign }: { campaign: CampaignRow }) {
  const raised = campaign.raised_cents || 0
  const goal = Math.max(1, campaign.funding_goal_cents || 0)
  const percentage = Math.min(100, Math.round((raised / goal) * 100))
  
  // Share URL for social cards
  const shareUrl = `https://uobgytlnzmngwxmweufu.functions.supabase.co/share-campaign/${campaign.slug}`

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-smooth group">
      <Link to={`/campaign/${campaign.slug}`}>
        <div className="relative overflow-hidden">
          <img
            src={campaign.image_url || 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=450&fit=crop'}
            alt={campaign.title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
        
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {campaign.title}
          </h3>
          
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {campaign.description}
          </p>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{centsToDisplay(raised)} raised</span>
              <span>{percentage}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full progress-gradient transition-all duration-500 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Goal: {centsToDisplay(goal)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1">
              View Campaign
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                window.open(shareUrl, '_blank')
              }}
            >
              Share
            </Button>
          </div>
        </div>
      </Link>
    </Card>
  )
}