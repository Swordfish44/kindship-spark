import React from 'react'
import { useParams } from 'react-router-dom'
import DonateWidget from '@/components/DonateWidget'

function parseQuery(search: string): Record<string,string> {
  return Object.fromEntries(new URLSearchParams(search)) as any
}

export default function Embed() {
  const { slug } = useParams()
  const q = parseQuery(location.search)
  const amounts = (q.amounts ? q.amounts.split(',').map(x=> Number(x)) : [2500,5000,10000,25000])
  const currency = q.currency || 'USD'
  const checkoutEndpoint = import.meta.env.VITE_CHECKOUT_ENDPOINT as string

  // Notify parent about height changes
  React.useEffect(() => {
    const ro = new ResizeObserver(() => {
      const h = document.body.scrollHeight
      parent.postMessage({ __NBT_EMBED__: true, type:'height', height:h }, '*')
    })
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [])

  if (!slug) {
    return (
      <main style={{ padding: 16, margin:0, fontFamily:'system-ui, Arial', background:'transparent' }}>
        <p style={{ color: '#ef4444', textAlign: 'center' }}>Error: No campaign slug provided</p>
      </main>
    )
  }

  return (
    <main style={{ padding: 0, margin:0, fontFamily:'system-ui, Arial', background:'transparent' }}>
      <DonateWidget 
        checkoutEndpoint={checkoutEndpoint} 
        campaignSlug={slug} 
        currency={currency} 
        amounts={amounts} 
      />
      <p style={{ fontSize:11, color:'#6b7280', textAlign:'center', marginTop:8 }}>
        Powered by FundFlow
      </p>
    </main>
  )
}