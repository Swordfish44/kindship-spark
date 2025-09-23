import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Share2, 
  Twitter, 
  Facebook, 
  Linkedin, 
  MessageCircle,
  Copy,
  Mail,
  QrCode
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import QRCode from 'qrcode';

interface SocialShareButtonProps {
  title: string;
  description: string;
  url: string;
  hashtags?: string[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  campaignId?: string;
}

const SocialShareButton = ({ 
  title, 
  description, 
  url,
  hashtags = [],
  variant = 'outline',
  size = 'default',
  campaignId
}: SocialShareButtonProps) => {
  const { toast } = useToast();
  const { trackSocialShare } = useAnalytics();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}${hashtags.length > 0 ? `&hashtags=${hashtags.join(',')}` : ''}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${description}\n\n${url}`)}`
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Campaign link has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const openShareWindow = (shareUrl: string, platform: string) => {
    if (campaignId) {
      trackSocialShare(campaignId, platform);
    }
    window.open(
      shareUrl,
      'share-window',
      'width=600,height=400,scrollbars=yes,resizable=yes'
    );
  };

  const generateQRCode = async () => {
    try {
      const qrUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrUrl);
      setQrDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleNativeShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share...
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={copyToClipboard}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => openShareWindow(shareUrls.twitter, 'twitter')}>
            <Twitter className="h-4 w-4 mr-2" />
            Share on Twitter
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => openShareWindow(shareUrls.facebook, 'facebook')}>
            <Facebook className="h-4 w-4 mr-2" />
            Share on Facebook
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => openShareWindow(shareUrls.linkedin, 'linkedin')}>
            <Linkedin className="h-4 w-4 mr-2" />
            Share on LinkedIn
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => openShareWindow(shareUrls.whatsapp, 'whatsapp')}>
            <MessageCircle className="h-4 w-4 mr-2" />
            Share on WhatsApp
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => window.location.href = shareUrls.email}>
            <Mail className="h-4 w-4 mr-2" />
            Share via Email
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={generateQRCode}>
            <QrCode className="h-4 w-4 mr-2" />
            QR Code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code"
                  className="mx-auto rounded-lg shadow-sm"
                />
              )}
            </div>
            <div>
              <Label htmlFor="share-url">Campaign URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="share-url"
                  value={url}
                  readOnly
                  className="flex-1"
                />
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code to open the campaign on any device
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SocialShareButton;