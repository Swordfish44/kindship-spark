import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Heart, ArrowLeft } from 'lucide-react'
import Header from '@/components/Header'

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-16">
        <div className="max-w-2xl mx-auto text-center">
          <Card>
            <CardContent className="p-12">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                  <Heart className="h-6 w-6 text-red-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
              </div>
              
              <h1 className="text-3xl font-bold mb-4">Thank you! 💛</h1>
              
              <p className="text-lg text-muted-foreground mb-6">
                Your generous donation has been received and is being processed. 
                You'll receive a confirmation email shortly.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-6 mb-8">
                <h2 className="font-semibold mb-2">What happens next?</h2>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li>• You'll receive an email confirmation from Stripe</li>
                  <li>• The campaign organizer will be notified of your donation</li>
                  <li>• If you selected a reward, the organizer will contact you</li>
                  <li>• You can track the campaign's progress anytime</li>
                </ul>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button asChild>
                  <Link to="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Browse More Campaigns
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}