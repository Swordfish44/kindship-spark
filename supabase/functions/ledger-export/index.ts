import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req: Request) => {
  try {
    const url = new URL(req.url)
    const start = url.searchParams.get('start') // ISO date
    const end = url.searchParams.get('end')     // ISO date
    const type = url.searchParams.get('type') || 'daily' // 'daily' or 'campaign'
    
    const startStr = start ? start.split('T')[0] : 'all'
    const endStr = end ? end.split('T')[0] : ''
    const filename = `ledger_${type}_${startStr}_${endStr}.csv`

    console.log(`Exporting ${type} ledger data from ${start || 'beginning'} to ${end || 'now'}`)

    let query = supabase.from(type === 'campaign' ? 'vw_ledger_by_campaign' : 'vw_ledger_daily')
      .select('*')

    if (type === 'daily') {
      query = query.order('day', { ascending: true })
    } else {
      query = query.order('gross_cents', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Query error:', error)
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Filter by date range if specified
    const filteredData = (data || []).filter((r: any) => {
      if (type === 'daily' && r.day) {
        const d = new Date(r.day)
        return (!start || d >= new Date(start)) && (!end || d <= new Date(end))
      }
      return true // For campaign view, don't filter by date
    })

    console.log(`Found ${filteredData.length} records`)

    // Generate CSV
    if (filteredData.length === 0) {
      return new Response('No data found for the specified criteria', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      })
    }

    // Get headers from first row
    const headers = Object.keys(filteredData[0])
    const csvHeaders = headers.join(',')

    // Generate CSV rows
    const csvRows = filteredData.map((row: any) => 
      headers.map(header => {
        const value = row[header]
        // Handle null/undefined values and escape commas/quotes
        if (value === null || value === undefined) return ''
        const stringValue = String(value)
        // Escape values that contain commas, quotes, or newlines
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      }).join(',')
    )

    const csv = [csvHeaders, ...csvRows].join('\n')

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (e: any) {
    console.error('ledger-export error:', e)
    return new Response(JSON.stringify({ 
      error: e.message || 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})