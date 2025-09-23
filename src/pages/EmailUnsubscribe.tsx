import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { CheckCircle, Mail, AlertTriangle, Loader2 } from 'lucide-react'
import Header from '@/components/Header'

export default function EmailUnsubscribe() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [reason, setReason] = useState('')
  const { toast } = useToast()

  const email = searchParams.get('email')
  const emailType = searchParams.get('type')

  useEffect(() => {
    if (!email) {
      toast({
        title: 'Invalid request',
        description: 'No email address provided in the unsubscribe link.',
        variant: 'destructive',
      })
    }
  }, [email, toast])

  const handleUnsubscribe = async () => {
    if (!email) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('email_unsubscribes')
        .upsert({
          email,
          email_type: emailType || null,
          reason: reason.trim() || null,
        }, {
          onConflict: 'email,email_type'
        })

      if (error) throw error

      setSuccess(true)
      toast({
        title: 'Unsubscribed successfully',
        description: emailType 
          ? `You've been unsubscribed from ${emailType.replace('_', ' ')} emails.`
          : 'You\'ve been unsubscribed from all emails.',
      })
    } catch (error) {
      console.error('Error unsubscribing:', error)
      toast({
        title: 'Error',
        description: 'Failed to process your unsubscribe request. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Invalid Request</h2>
                  <p className="text-muted-foreground">
                    This unsubscribe link is invalid or expired.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16">
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Successfully Unsubscribed</h2>
                  <p className="text-muted-foreground mb-4">
                    {emailType 
                      ? `You've been unsubscribed from ${emailType.replace('_', ' ')} emails.`
                      : 'You\'ve been unsubscribed from all emails.'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You can resubscribe at any time by updating your email preferences in your account settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Unsubscribe from Emails</CardTitle>
              <CardDescription>
                {emailType 
                  ? `Unsubscribe from ${emailType.replace('_', ' ')} emails`
                  : 'Unsubscribe from all emails'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Email: <strong>{email}</strong>
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  We're sorry to see you go. You can unsubscribe from{' '}
                  {emailType ? `${emailType.replace('_', ' ')} emails` : 'all emails'}{' '}
                  by clicking the button below.
                </p>
              </div>

              <div>
                <Label htmlFor="reason">Reason for unsubscribing (optional)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Help us improve by telling us why you're unsubscribing..."
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={handleUnsubscribe} 
                disabled={loading}
                className="w-full"
                variant="destructive"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {emailType 
                  ? `Unsubscribe from ${emailType.replace('_', ' ')}`
                  : 'Unsubscribe from all emails'}
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  You can manage your email preferences in your account settings instead of unsubscribing completely.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}