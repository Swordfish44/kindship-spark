import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { CreditCard, Lock } from 'lucide-react'

export type DonateWidgetProps = {
  checkoutEndpoint: string  // e.g. https://<project>.functions.supabase.co/create-checkout
  campaignSlug: string
  currency?: string         // display only; backend enforces real currency
  amounts?: number[]        // in cents
}

function fmt(cents: number, currency = 'USD') {
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency })
}

export default function DonateWidget({ 
  checkoutEndpoint, 
  campaignSlug, 
  currency = 'USD', 
  amounts = [2500, 5000, 10000, 25000] 
}: DonateWidgetProps) {
  const [amount, setAmount] = useState(amounts[1] || 5000)
  const [custom, setCustom] = useState('')
  const [tip, setTip] = useState([0])        // tip (cents) goes to platform via application_fee top-up
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const displayAmount = useMemo(() => {
    const c = Math.max(0, Math.floor(Number(custom || 0) * 100)) // convert dollars to cents
    return c > 0 ? c : amount
  }, [custom, amount])

  const tipAmount = tip[0] || 0

  async function donate() {
    try {
      setLoading(true); setError(null)
      const res = await fetch(checkoutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_slug: campaignSlug,
          amount_cents: displayAmount,
          tip_cents: tipAmount,
          success_url: window.location.origin + '/thank-you',
          cancel_url: window.location.href,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create checkout session')
      window.location.href = data.checkout_url
    } catch (e: any) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-0">
      <CardContent className="p-6 space-y-6">
        {/* Amount Selection */}
        <div>
          <Label className="text-base font-medium mb-3 block">Choose your donation amount</Label>
          <div className="grid grid-cols-2 gap-2">
            {amounts.map(a => (
              <Button 
                key={a} 
                variant={a === amount && !custom ? "default" : "outline"}
                onClick={() => { setAmount(a); setCustom('') }}
                className="h-12 font-semibold"
              >
                {fmt(a, currency)}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <Label htmlFor="custom-amount" className="text-sm text-muted-foreground">Custom amount (USD)</Label>
          <Input 
            id="custom-amount"
            type="number" 
            min={1} 
            step={1} 
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder={String((amounts[0] || 2500) / 100)}
            className="mt-1"
          />
          {displayAmount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Total: {fmt(displayAmount, currency)}
            </p>
          )}
        </div>

        {/* Tip Section */}
        <div>
          <Label className="text-sm text-muted-foreground">
            Add a tip to support the platform (optional)
          </Label>
          <div className="mt-2">
            <Slider
              value={tip}
              onValueChange={setTip}
              max={2500}
              step={100}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Tip: {fmt(tipAmount, currency)}</span>
              <span>Total charged: {fmt(displayAmount + tipAmount, currency)}</span>
            </div>
          </div>
        </div>

        {/* Donate Button */}
        <Button 
          onClick={donate} 
          disabled={loading || displayAmount < 100} 
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          {loading ? 'Redirecting…' : `Donate ${fmt(displayAmount + tipAmount, currency)}`}
        </Button>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Powered by Stripe. Donations are processed securely.</span>
        </div>
      </CardContent>
    </Card>
  )
}