import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { money } from '@/lib/utils'

export type DonateWidgetProps = {
  checkoutEndpoint: string
  campaignSlug: string
  currency?: string
  amounts?: number[]
}

export default function DonateWidget({ checkoutEndpoint, campaignSlug, currency = 'USD', amounts = [2500, 5000, 10000, 25000] }: DonateWidgetProps) {
  const [amount, setAmount] = useState(amounts[1] || 5000)
  const [custom, setCustom] = useState('')
  const [tip, setTip] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayAmount = useMemo(() => {
    const c = Math.max(0, Math.floor(Number(custom || 0)))
    return c > 0 ? c : amount
  }, [custom, amount])

  async function donate() {
    try {
      setLoading(true); setError(null)
      const res = await fetch(checkoutEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_slug: campaignSlug, amount_cents: displayAmount, tip_cents: tip, success_url: window.location.origin + '/thank-you', cancel_url: window.location.href })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session')
      window.location.href = data.checkout_url
    } catch (e: any) { setError(e.message || 'Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {amounts.map(a => (
          <Button key={a} variant={a===amount && !custom ? 'default':'outline'} size="sm" onClick={() => { setAmount(a); setCustom('') }}>{money(a, currency)}</Button>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-500">Custom amount</label>
        <div className="flex items-center gap-2">
          <Input type="number" min={1} step={1} value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={String((amounts[0]||2500)/100)} />
          <span className="text-sm text-gray-600 shrink-0">{money(displayAmount, currency)}</span>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-500">Add a tip to support the platform (optional)</label>
        <input className="w-full" type="range" min={0} max={2500} step={100} value={tip} onChange={e => setTip(Number(e.target.value))} />
        <div className="flex justify-between text-xs text-gray-500"><span>Tip: {money(tip, currency)}</span><span>Total: {money(displayAmount, currency)}</span></div>
      </div>

      <Button onClick={donate} disabled={loading} className="w-full h-11">{loading ? 'Redirecting…' : `Donate ${money(displayAmount, currency)}`}</Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-[11px] text-gray-500">Powered by Stripe. Donations are processed securely.</p>
    </div>
  )
}