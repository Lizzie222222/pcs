import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Link as LinkIcon,
  Check,
  MessageCircle,
} from 'lucide-react';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  description?: string;
}

export function ShareDialog({
  open,
  onOpenChange,
  url,
  title,
  description = '',
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
      `${description}\n\n${url}`
    )}`,
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      toast({
        title: 'Link Copied!',
        description: 'The link has been copied to your clipboard.',
      });

      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = (platform: keyof typeof shareUrls) => {
    const shareUrl = shareUrls[platform];
    if (platform === 'email') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  const socialButtons = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-[#1877F2] hover:bg-[#1877F2]/90',
      platform: 'facebook' as const,
      testId: 'button-share-facebook',
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-[#1DA1F2] hover:bg-[#1DA1F2]/90',
      platform: 'twitter' as const,
      testId: 'button-share-twitter',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'bg-[#0A66C2] hover:bg-[#0A66C2]/90',
      platform: 'linkedin' as const,
      testId: 'button-share-linkedin',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'bg-[#25D366] hover:bg-[#25D366]/90',
      platform: 'whatsapp' as const,
      testId: 'button-share-whatsapp',
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-gray-600 hover:bg-gray-600/90',
      platform: 'email' as const,
      testId: 'button-share-email',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-share">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-navy">
            Share This Success Story
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Help inspire others by sharing this amazing achievement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Social Media Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {socialButtons.map((button) => (
              <Button
                key={button.platform}
                onClick={() => handleShare(button.platform)}
                className={`${button.color} text-white transition-all duration-200 hover:scale-105 active:scale-95`}
                data-testid={button.testId}
              >
                <button.icon className="w-4 h-4 mr-2" />
                {button.name}
              </Button>
            ))}
          </div>

          {/* Copy Link Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-navy">Or copy link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-ocean-blue"
                data-testid="input-share-url"
              />
              <Button
                onClick={handleCopyLink}
                variant={copied ? 'default' : 'outline'}
                className={`transition-all duration-200 ${
                  copied 
                    ? 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
                    : 'border-ocean-blue text-ocean-blue hover:bg-ocean-blue hover:text-white'
                }`}
                data-testid="button-copy-link"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Native Share (Mobile) */}
          {typeof navigator !== 'undefined' && navigator.share && (
            <Button
              onClick={async () => {
                try {
                  await navigator.share({
                    title,
                    text: description,
                    url,
                  });
                } catch (err) {
                  console.log('Share failed:', err);
                }
              }}
              variant="outline"
              className="w-full border-2 border-dashed border-ocean-blue text-ocean-blue hover:bg-ocean-blue hover:text-white"
              data-testid="button-native-share"
            >
              More Sharing Options
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
