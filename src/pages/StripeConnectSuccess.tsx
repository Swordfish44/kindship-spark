import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, Package, ArrowLeft, ExternalLink } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

interface CheckoutSession {
  sessionId: string;
  paymentStatus: string;
  paymentIntentId?: string;
  customerEmail?: string;
  totalAmount: number;
  currency: string;
  metadata: Record<string, any>;
  transferInfo?: {
    destination: string;
    amount: number;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    amount: number;
    currency: string;
  }>;
}

/**
 * Stripe Connect Success Page
 * 
 * This page is displayed after a successful checkout session.
 * It retrieves and displays the order details including payment status,
 * items purchased, and transfer information to the seller.
 */
export default function StripeConnectSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<CheckoutSession | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails(sessionId);
    } else {
      setError('No session ID provided');
      setLoading(false);
    }
  }, [sessionId]);

  /**
   * Fetches the checkout session details from the API
   */
  const fetchSessionDetails = async (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe-connect-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get-session-status',
          sessionId: sessionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const sessionData = await response.json();
      setSession(sessionData);

    } catch (err: any) {
      console.error('Failed to fetch session details:', err);
      setError(`Failed to load order details: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formats price for display
   */
  const formatPrice = (amountInCents: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amountInCents / 100);
  };

  /**
   * Gets the appropriate status badge for payment status
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="mr-1 h-3 w-3" />
            Payment Successful
          </Badge>
        );
      case 'processing':
        return (
          <Badge variant="secondary">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case 'requires_payment_method':
        return (
          <Badge variant="destructive">
            Payment Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-muted-foreground">Loading order details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Thank You!</h1>
            <p className="text-muted-foreground">
              Your order has been processed successfully.
            </p>
          </div>

          {error && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertDescription className="text-destructive-foreground">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {session && (
            <>
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Order Details
                    {getStatusBadge(session.paymentStatus)}
                  </CardTitle>
                  <CardDescription>
                    Order confirmation and payment details
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-1">Session ID</h4>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {session.sessionId}
                      </code>
                    </div>
                    
                    {session.paymentIntentId && (
                      <div>
                        <h4 className="font-semibold mb-1">Payment ID</h4>
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {session.paymentIntentId}
                        </code>
                      </div>
                    )}
                    
                    {session.customerEmail && (
                      <div>
                        <h4 className="font-semibold mb-1">Email</h4>
                        <p className="text-sm">{session.customerEmail}</p>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-semibold mb-1">Total Amount</h4>
                      <p className="text-lg font-bold">
                        {formatPrice(session.totalAmount, session.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Items Purchased */}
                  {session.lineItems.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Items Purchased</h4>
                      <div className="space-y-2">
                        {session.lineItems.map((item, index) => (
                          <div key={index} className="flex justify-between items-center p-3 bg-muted rounded">
                            <div>
                              <p className="font-medium">{item.description}</p>
                              <p className="text-sm text-muted-foreground">
                                Quantity: {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold">
                              {formatPrice(item.amount, item.currency)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Transfer Information */}
                  {session.transferInfo && (
                    <div className="p-4 bg-accent/10 rounded-lg">
                      <h4 className="font-semibold mb-2">Payment Distribution</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Seller Account:</span>
                          <code className="font-mono">
                            {session.transferInfo.destination.slice(-8)}
                          </code>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount to Seller:</span>
                          <span className="font-semibold">
                            {formatPrice(session.transferInfo.amount, session.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Platform Commission:</span>
                          <span className="font-semibold">
                            {formatPrice(session.totalAmount - session.transferInfo.amount, session.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metadata */}
              {Object.keys(session.metadata).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(session.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="font-medium">{key.replace(/_/g, ' ')}:</span>
                          <span className="text-muted-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/stripe-connect/storefront">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Continue Shopping
              </Link>
            </Button>
            
            <Button asChild>
              <Link to="/stripe-connect">
                <Package className="mr-2 h-4 w-4" />
                Stripe Connect Demo
              </Link>
            </Button>
          </div>

          {/* Help Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Need help?</strong> This is a demo implementation of Stripe Connect.
                </p>
                <p>
                  In a production environment, you would typically send email confirmations
                  and provide order tracking capabilities.
                </p>
                <div className="flex justify-center gap-4 mt-4">
                  <Button variant="link" size="sm" asChild>
                    <a href="https://stripe.com/docs/connect" target="_blank" rel="noopener noreferrer">
                      Stripe Connect Docs
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}