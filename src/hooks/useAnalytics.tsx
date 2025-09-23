import { useEffect, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface AnalyticsEvent {
  eventType: 'page_view' | 'social_share' | 'email_open' | 'email_click' | 'session_tracking'
  campaignId?: string
  data?: Record<string, any>
}

export function useAnalytics() {
  const sessionStartTime = useRef<number>(Date.now())
  const visitedPages = useRef<Set<string>>(new Set())

  const trackEvent = async ({ eventType, campaignId, data }: AnalyticsEvent) => {
    if (!campaignId) return

    try {
      await fetch(`https://uobgytlnzmngwxmweufu.functions.supabase.co/track-analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvYmd5dGxuem1uZ3d4bXdldWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NTA4OTIsImV4cCI6MjA3NDEyNjg5Mn0.7hm6Vzmj1L131GOVOpA2iH7Rka5hsyb9XfSRwSa-2aA`,
        },
        body: JSON.stringify({
          eventType,
          campaignId,
          data: {
            ...data,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
          },
        }),
      })
    } catch (error) {
      console.error('Analytics tracking error:', error)
    }
  }

  const trackPageView = (campaignId: string, isUnique?: boolean) => {
    const pageKey = `${campaignId}-${window.location.pathname}`
    const isUniqueView = isUnique ?? !visitedPages.current.has(pageKey)
    
    if (isUniqueView) {
      visitedPages.current.add(pageKey)
    }

    trackEvent({
      eventType: 'page_view',
      campaignId,
      data: {
        isUnique: isUniqueView,
        page: window.location.pathname,
        title: document.title,
      },
    })
  }

  const trackSocialShare = (campaignId: string, platform: string) => {
    trackEvent({
      eventType: 'social_share',
      campaignId,
      data: { platform },
    })
  }

  const trackEmailOpen = (campaignId: string, emailType: string) => {
    trackEvent({
      eventType: 'email_open',
      campaignId,
      data: { emailType },
    })
  }

  const trackEmailClick = (campaignId: string, emailType: string, linkType: string) => {
    trackEvent({
      eventType: 'email_click',
      campaignId,
      data: { emailType, linkType },
    })
  }

  const trackSession = (campaignId: string) => {
    const sessionDuration = Date.now() - sessionStartTime.current
    
    trackEvent({
      eventType: 'session_tracking',
      campaignId,
      data: {
        sessionDuration: Math.round(sessionDuration / 1000), // seconds
        bounceRate: visitedPages.current.size === 1 ? 1 : 0,
        trafficSource: getTrafficSource(),
        deviceType: getDeviceType(),
        location: getLocation(),
      },
    })
  }

  const getTrafficSource = () => {
    const referrer = document.referrer
    if (!referrer) return 'direct'
    
    const url = new URL(referrer)
    const domain = url.hostname.toLowerCase()
    
    if (domain.includes('google')) return 'google'
    if (domain.includes('facebook')) return 'facebook'
    if (domain.includes('twitter') || domain.includes('x.com')) return 'twitter'
    if (domain.includes('linkedin')) return 'linkedin'
    if (domain.includes('reddit')) return 'reddit'
    
    return 'referral'
  }

  const getDeviceType = () => {
    const ua = navigator.userAgent
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile'
    return 'desktop'
  }

  const getLocation = () => {
    // This would typically use geolocation API or IP-based location
    // For now, return timezone as a proxy for location
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  // Track session end on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentUrl = window.location.pathname
      const campaignMatch = currentUrl.match(/\/campaign\/([^\/]+)/)
      if (campaignMatch) {
        // Note: This may not always work due to browser limitations on unload
        trackSession(campaignMatch[1])
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return {
    trackPageView,
    trackSocialShare,
    trackEmailOpen,
    trackEmailClick,
    trackSession,
  }
}