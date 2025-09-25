import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Package, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  productId: string;
  priceId: string;
  name: string;
  description?: string;
  images: string[];
  unitAmount: number;
  currency: string;
  connectedAccountId: string;
}

interface StripeConnectProductManagerProps {
  /** Connected account ID for this seller */
  connectedAccountId: string;
  /** Callback when a product is created */
  onProductCreated?: (product: Product) => void;
}

/**
 * Stripe Connect Product Manager Component
 * 
 * This component allows sellers to create and manage products in the marketplace.
 * Products are created at the platform level with metadata linking them to
 * the connected account for commission calculation.
 */
export function StripeConnectProductManager({ 
  connectedAccountId, 
  onProductCreated 
}: StripeConnectProductManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Product | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    images: '',
    category: '',
    tags: ''
  });

  /**
   * Handles form input changes
   */
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  /**
   * Validates form data before submission
   */
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Product name is required');
      return false;
    }

    if (!formData.price.trim()) {
      setError('Price is required');
      return false;
    }

    const priceNumber = parseFloat(formData.price);
    if (isNaN(priceNumber) || priceNumber < 0.50) {
      setError('Price must be at least $0.50');
      return false;
    }

    return true;
  };

  /**
   * Creates a new product via the Stripe Connect API
   */
  const createProduct = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert price to cents
      const priceInCents = Math.round(parseFloat(formData.price) * 100);
      
      // Parse images (comma-separated URLs)
      const imageUrls = formData.images
        .split(',')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      // Parse tags (comma-separated)
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const response = await fetch('/api/stripe-connect-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create-product',
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          priceInCents: priceInCents,
          currency: 'usd', // TODO: Allow currency selection
          connectedAccountId: connectedAccountId,
          images: imageUrls,
          category: formData.category.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const product = await response.json();
      setSuccess(product);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        images: '',
        category: '',
        tags: ''
      });

      toast.success('Product created successfully!');
      
      // Notify parent component
      if (onProductCreated) {
        onProductCreated(product);
      }

    } catch (err: any) {
      console.error('Product creation failed:', err);
      setError(`Failed to create product: ${err.message}`);
      toast.error('Failed to create product');
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

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Create New Product
        </CardTitle>
        <CardDescription>
          Add a new product to your storefront. Products will be available 
          for purchase by customers with automatic commission handling.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert className="border-destructive bg-destructive/10">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive-foreground">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-success bg-success/10">
            <CheckCircle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground space-y-2">
              <p>Product created successfully!</p>
              <div className="text-sm space-y-1">
                <p><strong>Product ID:</strong> {success.productId}</p>
                <p><strong>Price ID:</strong> {success.priceId}</p>
                <p><strong>Price:</strong> {formatPrice(success.unitAmount, success.currency)}</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name *</Label>
            <Input
              id="productName"
              type="text"
              placeholder="Enter product name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
            />
          </div>

          {/* Product Description */}
          <div className="space-y-2">
            <Label htmlFor="productDescription">Description</Label>
            <Textarea
              id="productDescription"
              placeholder="Describe your product..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="productPrice">Price (USD) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="productPrice"
                type="number"
                step="0.01"
                min="0.50"
                placeholder="0.00"
                className="pl-10"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                required
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Minimum price is $0.50. Platform will take a 5% commission.
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="productCategory">Category</Label>
            <Input
              id="productCategory"
              type="text"
              placeholder="e.g., Electronics, Clothing, Books"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="productTags">Tags</Label>
            <Input
              id="productTags"
              type="text"
              placeholder="Enter tags separated by commas"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              e.g., wireless, bluetooth, portable
            </p>
          </div>

          {/* Product Images */}
          <div className="space-y-2">
            <Label htmlFor="productImages">Image URLs</Label>
            <Textarea
              id="productImages"
              placeholder="Enter image URLs separated by commas&#10;https://example.com/image1.jpg,&#10;https://example.com/image2.jpg"
              value={formData.images}
              onChange={(e) => handleInputChange('images', e.target.value)}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Add URLs to product images. Images will be displayed in the storefront.
            </p>
          </div>
        </div>

        {/* Account Info */}
        <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">Connected Account:</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {connectedAccountId}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Products will be linked to this account for automatic payouts.
          </p>
        </div>

        {/* Create Button */}
        <Button 
          onClick={createProduct} 
          disabled={loading || !formData.name.trim() || !formData.price.trim()}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Product...
            </>
          ) : (
            <>
              <Package className="mr-2 h-4 w-4" />
              Create Product
            </>
          )}
        </Button>

        {/* Information */}
        <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Products are created at the platform level for centralized management</li>
            <li>Your account ID is stored in metadata for automatic commission handling</li>
            <li>Platform takes a 5% commission on all sales</li>
            <li>Remaining amount is automatically transferred to your account</li>
            <li>All prices are in USD (more currencies coming soon)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}