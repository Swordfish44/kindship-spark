import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Loader2, ShoppingCart, Package, AlertCircle, ExternalLink, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description?: string;
  images: string[];
  metadata: Record<string, any>;
  price: {
    id: string;
    unitAmount: number;
    currency: string;
  } | null;
  connectedAccountId: string | null;
  category: string | null;
  tags: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

/**
 * Stripe Connect Storefront Component
 * 
 * This component displays all products from connected accounts and allows
 * customers to purchase them using Stripe Checkout with destination charges.
 */
export function StripeConnectStorefront() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, []);

  /**
   * Loads all products from the marketplace
   */
  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe-connect-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'list-products',
          limit: 50 // Load up to 50 products
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setProducts(data.products || []);

    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(`Failed to load products: ${err.message}`);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Formats price for display
   */
  const formatPrice = (amountInCents: number | null, currency: string = 'usd') => {
    if (amountInCents === null) return 'Price not available';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amountInCents / 100);
  };

  /**
   * Adds a product to the cart or increases quantity
   */
  const addToCart = (product: Product) => {
    if (!product.price) {
      toast.error('Product price not available');
      return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      
      if (existingItem) {
        // Increase quantity
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new item
        return [...prevCart, { product, quantity: 1 }];
      }
    });

    toast.success(`Added ${product.name} to cart`);
  };

  /**
   * Removes a product from cart or decreases quantity
   */
  const removeFromCart = (productId: string) => {
    setCart(prevCart => {
      return prevCart.reduce((acc, item) => {
        if (item.product.id === productId) {
          if (item.quantity > 1) {
            // Decrease quantity
            acc.push({ ...item, quantity: item.quantity - 1 });
          }
          // If quantity is 1, don't add to acc (remove item)
        } else {
          acc.push(item);
        }
        return acc;
      }, [] as CartItem[]);
    });
  };

  /**
   * Calculates total cart value
   */
  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const price = item.product.price?.unitAmount || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  /**
   * Groups cart items by connected account for checkout
   */
  const groupCartByAccount = () => {
    const groups: Record<string, CartItem[]> = {};
    
    cart.forEach(item => {
      const accountId = item.product.connectedAccountId || 'unknown';
      if (!groups[accountId]) {
        groups[accountId] = [];
      }
      groups[accountId].push(item);
    });

    return groups;
  };

  /**
   * Creates checkout session for items from a single connected account
   */
  const checkoutAccount = async (accountId: string, items: CartItem[]) => {
    if (!accountId || accountId === 'unknown') {
      toast.error('Invalid account for checkout');
      return;
    }

    setCheckoutLoading(true);

    try {
      // Prepare product data for checkout
      const productIds = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      const response = await fetch('/api/stripe-connect-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-checkout-session',
          productIds: productIds,
          connectedAccountId: accountId,
          customerEmail: customerEmail.trim() || undefined,
          applicationFeePercent: 5, // 5% platform fee
          metadata: {
            cart_session: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (err: any) {
      console.error('Checkout failed:', err);
      toast.error(`Checkout failed: ${err.message}`);
    } finally {
      setCheckoutLoading(false);
    }
  };

  /**
   * Handles checkout for all items in cart
   * Note: In a real application, you might want to handle multiple accounts differently
   */
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const accountGroups = groupCartByAccount();
    const accountIds = Object.keys(accountGroups);

    if (accountIds.length === 1) {
      // Single account - proceed with checkout
      const accountId = accountIds[0];
      checkoutAccount(accountId, accountGroups[accountId]);
    } else if (accountIds.length > 1) {
      // Multiple accounts - for demo, we'll checkout the first one
      // In production, you might want to split into multiple checkouts
      toast.info('Multiple sellers detected. Checking out first seller\'s items.');
      const firstAccountId = accountIds[0];
      checkoutAccount(firstAccountId, accountGroups[firstAccountId]);
    }
  };

  /**
   * Renders a single product card
   */
  const renderProduct = (product: Product) => (
    <Card key={product.id} className="h-full flex flex-col">
      {/* Product Image */}
      {product.images.length > 0 && (
        <div className="aspect-square overflow-hidden rounded-t-lg">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
      
      <CardHeader className="flex-1">
        <div className="space-y-2">
          <CardTitle className="line-clamp-2">{product.name}</CardTitle>
          {product.description && (
            <CardDescription className="line-clamp-3">
              {product.description}
            </CardDescription>
          )}
        </div>

        {/* Tags and Category */}
        <div className="flex flex-wrap gap-1">
          {product.category && (
            <Badge variant="secondary" className="text-xs">
              {product.category}
            </Badge>
          )}
          {product.tags.slice(0, 2).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Price */}
        <div className="text-2xl font-bold">
          {product.price ? 
            formatPrice(product.price.unitAmount, product.price.currency) : 
            'Price not available'
          }
        </div>

        {/* Connected Account Badge */}
        {product.connectedAccountId && (
          <div className="text-xs text-muted-foreground">
            Seller: {product.connectedAccountId.slice(-8)}
          </div>
        )}

        {/* Add to Cart Button */}
        <Button
          onClick={() => addToCart(product)}
          disabled={!product.price}
          className="w-full"
          size="sm"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );

  /**
   * Renders the shopping cart
   */
  const renderCart = () => {
    if (cart.length === 0) return null;

    return (
      <Card className="sticky top-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({cart.length} items)
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Cart Items */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                <div className="flex-1 text-sm">
                  <div className="font-medium">{item.product.name}</div>
                  <div className="text-muted-foreground">
                    {formatPrice(item.product.price?.unitAmount || 0)}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToCart(item.product)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email (Optional)</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>

          {/* Cart Total */}
          <div className="text-lg font-bold">
            Total: {formatPrice(getCartTotal())}
          </div>

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={checkoutLoading || cart.length === 0}
            className="w-full"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Checkout
                <ExternalLink className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {/* Fee Information */}
          <div className="text-xs text-muted-foreground">
            Platform fee (5%): {formatPrice(Math.round(getCartTotal() * 0.05))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
            <p className="text-muted-foreground">
              Discover products from our sellers. All purchases are securely processed through Stripe.
            </p>
          </div>

          {error && (
            <Alert className="mb-6 border-destructive bg-destructive/10">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-destructive-foreground">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {products.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products available</h3>
                <p className="text-muted-foreground text-center">
                  No products have been created yet. Sellers can add products 
                  through the product management interface.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(renderProduct)}
            </div>
          )}
        </div>

        {/* Sidebar Cart */}
        <div className="lg:w-80">
          {renderCart()}
        </div>
      </div>
    </div>
  );
}