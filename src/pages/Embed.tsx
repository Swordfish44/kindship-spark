import React from 'react'
import { useParams } from 'react-router-dom'
import DonateWidget from '@/components/DonateWidget'

function parseQuery(search: string): Record<string,string> {
  return Object.fromEntries(new URLSearchParams(search)) as any
}

export default function Embed() {
  const { slug } = useParams()
  const q = parseQuery(location.search)
  const amounts = (q.amounts ? q.amounts.split(',').map((x:string)=> Number(x)) : [2500,5000,10000,25000])
  const currency = q.currency || 'USD'
  const checkoutEndpoint = import.meta.env.VITE_CHECKOUT_ENDPOINT as string

  React.useEffect(() => {
    const ro = new ResizeObserver(() => {
      const h = document.body.scrollHeight
      parent.postMessage({ __NBT_EMBED__: true, type:'height', height:h }, '*')
    })
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [])

  return (
    <main className="bg-transparent">
      <div className="p-0">
        <DonateWidget checkoutEndpoint={checkoutEndpoint} campaignSlug={slug!} currency={currency} amounts={amounts} />
        <p className="text-center text-[11px] text-gray-500 mt-2">Powered by National Black Treasury</p>
      </div>
    </main>
  )
}