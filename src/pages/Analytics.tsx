import React from 'react'
import Header from '@/components/Header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AnalyticsOverview from '@/components/AnalyticsOverview'
import RealTimeAnalytics from '@/components/RealTimeAnalytics'
import { BarChart3, Activity, TrendingUp } from 'lucide-react'

export default function Analytics() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive insights into your campaign performance and backer behavior
            </p>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4" />
                <span>Performance Overview</span>
              </TabsTrigger>
              <TabsTrigger value="realtime" className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Real-Time Dashboard</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              <AnalyticsOverview />
            </TabsContent>
            
            <TabsContent value="realtime" className="mt-6">
              <RealTimeAnalytics />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}