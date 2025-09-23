import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EmailPreferences from '@/components/EmailPreferences'
import EmailCampaignManager from '@/components/EmailCampaignManager'
import { Mail, Settings, Megaphone } from 'lucide-react'

export default function EmailManagementTabs() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Email Management</h1>
        <p className="text-muted-foreground">
          Manage your email preferences and marketing campaigns
        </p>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preferences" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Email Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center space-x-2">
            <Megaphone className="h-4 w-4" />
            <span>Marketing Campaigns</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="preferences" className="mt-6">
          <EmailPreferences />
        </TabsContent>
        
        <TabsContent value="campaigns" className="mt-6">
          <EmailCampaignManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}