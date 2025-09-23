import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { money } from '@/lib/utils'
import { Share2, ExternalLink } from 'lucide-react'

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!)

type Row = { slug:string; title:string; description:string; hero_image_url?:string; goal_cents:number; currency:string; raised_cents:number; created_at:string }

export default function Discover(){
  const [q,setQ] = useState('')
  const [sort,setSort] = useState<'recent'|'most_raised'|'progress'>('recent')
  const [page,setPage] = useState(1)
  const [rows,setRows] = useState<Row[]>([])
  const [loading,setLoading] = useState(true)
  const shareBase = (import.meta.env.VITE_SHARE_BASE || '').replace(/\/$/,'')

  async function load(){
    setLoading(true)
    const { data } = await supabase.rpc('public_discover_campaigns', { p_search: q || null, p_sort: sort, p_page: page, p_size: 24 })
    setRows(data || [])
    setLoading(false)
  }

  useEffect(()=>{ load() }, [q,sort,page])

  return (
    <div className="page">
      <div className="container-nbt py-8 space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-500">Search</label>
            <Input value={q} onChange={e=>{ setPage(1); setQ(e.target.value) }} placeholder="Search campaigns" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Sort by</label>
            <Select value={sort} onValueChange={(value)=>{ setPage(1); setSort(value as any) }}>
              <option value="recent">Most recent</option>
              <option value="most_raised">Most raised</option>
              <option value="progress">Closest to goal</option>
            </Select>
          </div>
        </div>

        {loading ? <p>Loading…</p> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(r => <DiscoverCard key={r.slug} row={r} shareBase={shareBase} />)}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={()=> setPage(p=> Math.max(1,p-1))} disabled={page===1}>Prev</Button>
          <span className="text-sm text-gray-600">Page {page}</span>
          <Button variant="outline" onClick={()=> setPage(p=> p+1)} disabled={rows.length < 24}>Next</Button>
        </div>
      </div>
    </div>
  )
}

function DiscoverCard({ row, shareBase }: { row: Row; shareBase: string }){
  const raised = row.raised_cents || 0
  const goal = Math.max(1, row.goal_cents || 0)
  const pct = Math.min(100, Math.round((raised/goal)*100))
  const shareUrl = shareBase ? `${shareBase}/${row.slug}` : ''
  return (
    <Card>
      <CardHeader className="p-0">
        <img src={row.hero_image_url || 'https://picsum.photos/800/450'} alt="hero" className="w-full h-44 object-cover rounded-t-2xl" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <h3 className="font-semibold text-lg leading-tight">{row.title}</h3>
          <Progress value={pct} />
          <div className="flex gap-3 text-sm text-gray-700">
            <strong>{money(raised, row.currency)}</strong>
            <span>of {money(goal, row.currency)}</span>
            <span>· {pct}%</span>
          </div>
          <div className="flex gap-2">
            <Button asChild><Link to={`/campaign/${row.slug}`}><ExternalLink className="w-4 h-4 mr-2"/> View</Link></Button>
            {shareUrl && <Button variant="outline" asChild><a href={shareUrl} target="_blank"><Share2 className="w-4 h-4 mr-2"/> Share</a></Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}