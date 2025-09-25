import React, { useState } from 'react';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StripeConnectOnboarding } from '@/components/StripeConnectOnboarding';
import { StripeConnectProductManager } from '@/components/StripeConnectProductManager';
import { StripeConnectStorefront } from '@/components/StripeConnectStorefront';
import { Badge } from '@/components/ui/badge';
import { Store, Package, ShoppingCart, CreditCard } from 'lucide-react';

/**
 * Stripe Connect Demo Page
 * 
 * This page demonstrates a complete Stripe Connect integration including:
 * 1. Account onboarding for sellers
 * 2. Product management for sellers
 * 3. Storefront for customers
 * 
 * The integration uses the controller model where the platform is responsible
 * for pricing, fee collection, and handling losses/refunds/chargebacks.
 */
export default function StripeConnect() {
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);

  const handleOnboardingComplete = (accountId: string) => {
    setConnectedAccountId(accountId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Stripe Connect Demo</h1>
          <p className="text-xl text-muted-foreground mb-6">
            Complete marketplace integration with onboarding, product management, and payments
          </p>
          
          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Badge variant="outline" className="flex items-center gap-1">
              <Store className="h-3 w-3" />
              Controller Model
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              Destination Charges
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              Platform Products
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              Hosted Checkout
            </Badge>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="onboarding" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="onboarding" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              Seller Onboarding
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Product Management
            </TabsTrigger>
            <TabsTrigger value="storefront" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Customer Storefront
            </TabsTrigger>
          </TabsList>

          {/* Seller Onboarding Tab */}
          <TabsContent value="onboarding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seller Account Setup</CardTitle>
                <CardDescription>
                  Create and onboard a Stripe Connect account to start selling products.
                  This demo uses the controller model where the platform handles pricing and fees.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StripeConnectOnboarding onOnboardingComplete={handleOnboardingComplete} />
              </CardContent>
            </Card>

            {/* Integration Details */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Implementation</CardTitle>
                <CardDescription>
                  How this integration works under the hood
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Account Creation</h4>
                    <p className="text-sm text-muted-foreground">
                      Creates Stripe Connect accounts using the controller model with 
                      platform-controlled fees and losses. No top-level type parameter used.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Onboarding Flow</h4>
                    <p className="text-sm text-muted-foreground">
                      Uses Account Links to redirect users to Stripe's hosted onboarding
                      with proper return/refresh URL handling.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Status Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      Real-time account status checking using the accounts API
                      to display onboarding progress and requirements.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Security</h4>
                    <p className="text-sm text-muted-foreground">
                      All operations require authentication and use proper error handling
                      with detailed logging for debugging.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Management Tab */}
          <TabsContent value="products" className="space-y-6">
            {!connectedAccountId ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8">
                  <Store className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Account Required</h3>
                  <p className="text-muted-foreground text-center">
                    Complete seller onboarding first to manage products.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Product Creation</CardTitle>
                    <CardDescription>
                      Create products that will be available in the marketplace.
                      Products are created at the platform level with your account linked in metadata.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <StripeConnectProductManager 
                      connectedAccountId={connectedAccountId}
                      onProductCreated={(product) => {
                        console.log('Product created:', product);
                      }}
                    />
                  </CardContent>
                </Card>

                {/* Product Management Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>How Product Management Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Platform Products</h4>
                        <p className="text-sm text-muted-foreground">
                          Products are created at the platform level, not on individual
                          connected accounts, for centralized management.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Metadata Linking</h4>
                        <p className="text-sm text-muted-foreground">
                          Connected account IDs are stored in product metadata
                          to determine where payments should be transferred.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Pricing Control</h4>
                        <p className="text-sm text-muted-foreground">
                          Platform controls pricing with automatic commission
                          calculation and transparent fee display.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Rich Metadata</h4>
                        <p className="text-sm text-muted-foreground">
                          Support for categories, tags, and custom metadata
                          for advanced product organization and search.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Storefront Tab */}
          <TabsContent value="storefront" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Experience</CardTitle>
                <CardDescription>
                  Browse and purchase products from all sellers in the marketplace.
                  Payments are processed securely with automatic commission handling.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <StripeConnectStorefront />
              </CardContent>
            </Card>

            {/* Checkout Process Details */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Processing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Destination Charges</h4>
                    <p className="text-sm text-muted-foreground">
                      Uses destination charges with application fees to automatically
                      split payments between platform and sellers.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Hosted Checkout</h4>
                    <p className="text-sm text-muted-foreground">
                      Leverages Stripe's hosted checkout for secure payment processing
                      with built-in fraud protection and international support.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Multi-seller Support</h4>
                    <p className="text-sm text-muted-foreground">
                      Handles products from multiple sellers with proper
                      commission distribution and automatic payouts.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-2">Customer Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Collects billing and shipping information with optional
                      customer email for receipt and order tracking.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* API Documentation */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
            <CardDescription>
              Key endpoints and their usage in this Stripe Connect integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Account Management</h4>
                  <code className="text-xs bg-background p-2 rounded block mb-2">
                    POST /api/stripe-connect-account
                  </code>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• create-account</li>
                    <li>• get-account-status</li>
                    <li>• create-onboarding-link</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Product Management</h4>
                  <code className="text-xs bg-background p-2 rounded block mb-2">
                    POST /api/stripe-connect-products
                  </code>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• create-product</li>
                    <li>• list-products</li>
                    <li>• get-product</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Checkout & Payments</h4>
                  <code className="text-xs bg-background p-2 rounded block mb-2">
                    POST /api/stripe-connect-checkout
                  </code>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• create-checkout-session</li>
                    <li>• get-session-status</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}