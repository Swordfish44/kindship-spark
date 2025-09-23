import React from 'react'
import Header from '@/components/Header'
import EmailManagementTabs from '@/components/EmailManagementTabs'

export default function Settings() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <EmailManagementTabs />
      </main>
    </div>
  )
}