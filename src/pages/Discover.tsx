import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { money } from '@/lib/utils'
import { 
  Share2, 
  ExternalLink, 
  Filter, 
  Search, 
  TrendingUp, 
  Star, 
  Users, 
  Calendar,
  Target,
  Grid3X3,
  List,
  SlidersHorizontal
} from 'lucide-react'
import Header from '@/components/Header'

type Row = { 
  slug: string; 
  title: string; 
  description: string; 
  image_url?: string; 
  funding_goal_cents: number; 
  currency: string; 
  raised_cents: number; 
  created_at: string;
  category_name?: string;
  category_color?: string;
  backer_count: number;
  progress_percentage: number;
  organizer_name?: string;
  days_remaining: number;
}

type Category = {
  id: string;
  name: string;
  color_hex: string;
  icon_name?: string;
}

export default function Discover() {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'recent'|'most_raised'|'progress'|'goal_amount'>('recent')
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<Row[]>([])
  const [featuredRows, setFeaturedRows] = useState<Row[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid')
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [fundingStatus, setFundingStatus] = useState<string>('')
  const [goalRange, setGoalRange] = useState<[number, number]>([0, 1000000])
  const [showFilters, setShowFilters] = useState(false)
  
  const shareBase = 'https://uobgytlnzmngwxmweufu.functions.supabase.co/share-campaign'

  async function load() {
    setLoading(true)
    const { data } = await supabase.rpc('public_discover_campaigns', { 
      p_search: q || null, 
      p_sort: sort, 
      p_page: page, 
      p_size: 24,
      p_category_id: selectedCategory || null,
      p_min_goal_cents: goalRange[0] * 100,
      p_max_goal_cents: goalRange[1] * 100,
      p_funding_status: fundingStatus || null
    })
    setRows(data || [])
    setLoading(false)
  }

  async function loadFeatured() {
    const { data } = await supabase.rpc('public_discover_campaigns', { 
      p_sort: 'most_raised', 
      p_size: 6 
    })
    setFeaturedRows(data?.slice(0, 6) || [])
  }

  async function loadCategories() {
    const { data } = await supabase
      .from('campaign_categories')
      .select('*')
      .order('name')
    setCategories(data || [])
  }

  useEffect(() => { 
    loadCategories()
    loadFeatured()
  }, [])

  useEffect(() => { 
    const timer = setTimeout(() => {
      load()
    }, 300) // Debounce search
    
    return () => clearTimeout(timer)
  }, [q, sort, page, selectedCategory, fundingStatus, goalRange])

  const resetFilters = () => {
    setSelectedCategory('')
    setFundingStatus('')
    setGoalRange([0, 1000000])
    setQ('')
    setPage(1)
  }

  const hasActiveFilters = selectedCategory || fundingStatus || q || (goalRange[0] > 0 || goalRange[1] < 1000000)

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Discover Amazing Projects
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore innovative campaigns, support creators, and be part of bringing great ideas to life
          </p>
        </div>

        {/* Featured Section */}
        {featuredRows.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold">Trending Campaigns</h2>
                <p className="text-muted-foreground">Most successful campaigns this month</p>
              </div>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredRows.map(row => (
                <CampaignCard key={row.slug} row={row} shareBase={shareBase} featured />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                value={q} 
                onChange={(e) => { setPage(1); setQ(e.target.value) }} 
                placeholder="Search campaigns by title, description, or creator..." 
                className="pl-10"
              />
            </div>
            
            {/* Desktop Filters */}
            <div className="hidden lg:flex items-center gap-4">
              <Select value={selectedCategory} onValueChange={(value) => { setPage(1); setSelectedCategory(value) }}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: cat.color_hex }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={fundingStatus} onValueChange={(value) => { setPage(1); setFundingStatus(value) }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="new">Just Launched</SelectItem>
                  <SelectItem value="active">In Progress</SelectItem>
                  <SelectItem value="funded">Successfully Funded</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sort} onValueChange={(value) => { setPage(1); setSort(value as any) }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="most_raised">Most Raised</SelectItem>
                  <SelectItem value="progress">Closest to Goal</SelectItem>
                  <SelectItem value="goal_amount">Highest Goal</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>

            {/* Mobile Filters */}
            <div className="lg:hidden flex items-center gap-2">
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                        {[selectedCategory, fundingStatus, q].filter(Boolean).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Campaigns</SheetTitle>
                    <SheetDescription>
                      Find exactly what you're looking for
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="space-y-6 mt-6">
                    <div>
                      <Label>Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Categories</SelectItem>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: cat.color_hex }}
                                />
                                {cat.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Funding Status</Label>
                      <Select value={fundingStatus} onValueChange={setFundingStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Status</SelectItem>
                          <SelectItem value="new">Just Launched</SelectItem>
                          <SelectItem value="active">In Progress</SelectItem>
                          <SelectItem value="funded">Successfully Funded</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Funding Goal Range</Label>
                      <div className="px-3 py-4">
                        <Slider
                          value={goalRange}
                          onValueChange={(value) => setGoalRange(value as [number, number])}
                          max={1000000}
                          min={0}
                          step={10000}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-2">
                          <span>{money(goalRange[0] * 100, 'usd')}</span>
                          <span>{money(goalRange[1] * 100, 'usd')}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label>Sort By</Label>
                      <Select value={sort} onValueChange={(value) => setSort(value as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recent">Most Recent</SelectItem>
                          <SelectItem value="most_raised">Most Raised</SelectItem>
                          <SelectItem value="progress">Closest to Goal</SelectItem>
                          <SelectItem value="goal_amount">Highest Goal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex gap-2">
                      <Button onClick={resetFilters} variant="outline" className="flex-1">
                        Clear All
                      </Button>
                      <Button onClick={() => setShowFilters(false)} className="flex-1">
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1">
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <button onClick={() => setSelectedCategory('')} className="ml-1 text-xs">×</button>
                </Badge>
              )}
              {fundingStatus && (
                <Badge variant="secondary" className="gap-1">
                  {fundingStatus === 'new' ? 'Just Launched' : 
                   fundingStatus === 'active' ? 'In Progress' : 
                   'Successfully Funded'}
                  <button onClick={() => setFundingStatus('')} className="ml-1 text-xs">×</button>
                </Badge>
              )}
              {q && (
                <Badge variant="secondary" className="gap-1">
                  "{q}"
                  <button onClick={() => setQ('')} className="ml-1 text-xs">×</button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {loading ? 'Loading...' : `${rows.length} campaigns found`}
              </span>
              {page > 1 && (
                <span className="text-muted-foreground">- Page {page}</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto">
                  <Search className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">No campaigns found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search criteria or browse our featured campaigns above.
                </p>
                <Button onClick={resetFilters} variant="outline">
                  Clear Filters
                </Button>
              </div>
            </Card>
          ) : (
            <div className={viewMode === 'grid' 
              ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3" 
              : "space-y-4"
            }>
              {rows.map(row => (
                <CampaignCard 
                  key={row.slug} 
                  row={row} 
                  shareBase={shareBase} 
                  viewMode={viewMode}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {rows.length > 0 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              <Button 
                variant="outline" 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-4">
                Page {page}
              </span>
              <Button 
                variant="outline" 
                onClick={() => setPage(p => p + 1)} 
                disabled={rows.length < 24}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CampaignCard({ 
  row, 
  shareBase, 
  featured = false, 
  viewMode = 'grid' 
}: { 
  row: Row; 
  shareBase: string; 
  featured?: boolean;
  viewMode?: 'grid' | 'list';
}) {
  const raised = row.raised_cents || 0
  const goal = Math.max(1, row.funding_goal_cents || 0)
  const pct = Math.min(100, Math.round((raised/goal)*100))
  const shareUrl = shareBase ? `${shareBase}/${row.slug}` : ''
  
  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-all">
        <CardContent className="p-0">
          <div className="flex gap-6">
            <div className="w-48 h-32 flex-shrink-0">
              <img 
                src={row.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=450&fit=crop&crop=entropy&auto=format'} 
                alt={row.title}
                className="w-full h-full object-cover rounded-l-lg" 
              />
            </div>
            <div className="flex-1 p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {row.category_name && (
                        <Badge 
                          variant="outline"
                          className="text-white text-xs"
                          style={{ backgroundColor: row.category_color }}
                        >
                          {row.category_name}
                        </Badge>
                      )}
                      {featured && (
                        <Badge variant="secondary" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Trending
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg leading-tight">{row.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      by {row.organizer_name || 'Anonymous'}
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {row.description}
                </p>
              </div>
              
              <div className="space-y-3">
                <Progress value={pct} className="h-2" />
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{money(raised, row.currency)}</span>
                    <span className="text-muted-foreground">of {money(goal, row.currency)}</span>
                    <span className="text-primary">{pct}% funded</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{row.backer_count} backers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{row.days_remaining} days left</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button asChild className="flex-1">
                  <Link to={`/campaign/${row.slug}`}>
                    <ExternalLink className="w-4 h-4 mr-2" /> 
                    View Campaign
                  </Link>
                </Button>
                {shareUrl && (
                  <Button variant="outline" asChild>
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                      <Share2 className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="p-0 relative overflow-hidden">
        <img 
          src={row.image_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=450&fit=crop&crop=entropy&auto=format'} 
          alt={row.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" 
        />
        <div className="absolute top-4 left-4 flex gap-2">
          {row.category_name && (
            <Badge 
              className="text-white shadow-lg"
              style={{ backgroundColor: row.category_color }}
            >
              {row.category_name}
            </Badge>
          )}
          {featured && (
            <Badge variant="secondary" className="shadow-lg">
              <TrendingUp className="h-3 w-3 mr-1" />
              Trending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {row.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              by {row.organizer_name || 'Anonymous'}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {row.description}
            </p>
          </div>
          
          <div className="space-y-3">
            <Progress value={pct} className="h-2" />
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{money(raised, row.currency)}</span>
                <span className="text-primary font-medium">{pct}%</span>
              </div>
              <div className="text-xs text-muted-foreground">
                of {money(goal, row.currency)} goal
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{row.backer_count} backers</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{row.days_remaining} days left</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button asChild className="flex-1" size="sm">
              <Link to={`/campaign/${row.slug}`}>
                View Campaign
              </Link>
            </Button>
            {shareUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <Share2 className="w-4 h-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}