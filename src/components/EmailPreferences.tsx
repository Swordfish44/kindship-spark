import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Mail, Bell, Heart, Megaphone, Loader2 } from 'lucide-react'

interface EmailPreference {
  email_type: string
  is_enabled: boolean
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const emailTypes: EmailPreference[] = [
  {
    email_type: 'donation_receipts',
    is_enabled: true,
    icon: Heart,
    title: 'Donation Receipts',
    description: 'Receive receipts when you make donations'
  },
  {
    email_type: 'campaign_updates',
    is_enabled: true,
    icon: Bell,
    title: 'Campaign Updates',
    description: 'Get notified when campaigns you support post updates'
  },
  {
    email_type: 'marketing',
    is_enabled: false,
    icon: Megaphone,
    title: 'Marketing & Newsletter',
    description: 'Receive our newsletter and promotional emails'
  },
  {
    email_type: 'announcements',
    is_enabled: true,
    icon: Mail,
    title: 'Platform Announcements',
    description: 'Important updates about our platform'
  }
]

export default function EmailPreferences() {
  const [preferences, setPreferences] = useState<EmailPreference[]>(emailTypes)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (user) {
      loadPreferences()
    }
  }, [user])

  const loadPreferences = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('email_preferences')
        .select('email_type, is_enabled')
        .eq('user_id', user.id)

      if (error) throw error

      // Update preferences with saved values
      const updatedPreferences = emailTypes.map(type => {
        const saved = data?.find(p => p.email_type === type.email_type)
        return saved ? { ...type, is_enabled: saved.is_enabled } : type
      })

      setPreferences(updatedPreferences)
    } catch (error) {
      console.error('Error loading email preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to load email preferences',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = (emailType: string, isEnabled: boolean) => {
    setPreferences(prev =>
      prev.map(p =>
        p.email_type === emailType ? { ...p, is_enabled: isEnabled } : p
      )
    )
  }

  const savePreferences = async () => {
    if (!user) return

    setSaving(true)
    try {
      // Upsert all preferences
      const upsertData = preferences.map(p => ({
        user_id: user.id,
        email_type: p.email_type,
        is_enabled: p.is_enabled,
      }))

      const { error } = await supabase
        .from('email_preferences')
        .upsert(upsertData, {
          onConflict: 'user_id,email_type'
        })

      if (error) throw error

      toast({
        title: 'Preferences saved',
        description: 'Your email preferences have been updated successfully.',
      })
    } catch (error) {
      console.error('Error saving email preferences:', error)
      toast({
        title: 'Error',
        description: 'Failed to save email preferences. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center">
            Please sign in to manage your email preferences.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-muted-foreground">Loading preferences...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Mail className="h-5 w-5" />
          <span>Email Preferences</span>
        </CardTitle>
        <CardDescription>
          Choose which emails you'd like to receive from us.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {preferences.map((preference) => {
            const Icon = preference.icon
            return (
              <div
                key={preference.email_type}
                className="flex items-start space-x-4 p-4 border border-border rounded-lg transition-smooth hover:shadow-card"
              >
                <div className="mt-1">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={preference.email_type}
                    className="text-base font-medium cursor-pointer"
                  >
                    {preference.title}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {preference.description}
                  </p>
                </div>
                <Switch
                  id={preference.email_type}
                  checked={preference.is_enabled}
                  onCheckedChange={(checked) =>
                    updatePreference(preference.email_type, checked)
                  }
                />
              </div>
            )
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={savePreferences} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}