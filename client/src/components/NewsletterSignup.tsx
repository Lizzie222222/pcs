import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface NewsletterSignupProps {
  variant?: "default" | "compact" | "hero";
  className?: string;
  schoolName?: string;
  schoolCountry?: string;
}

interface NewsletterData {
  email: string;
  firstName?: string;
  lastName?: string;
  schoolName?: string;
  schoolCountry?: string;
  tags?: string[];
}

export function NewsletterSignup({ 
  variant = "default", 
  className = "",
  schoolName,
  schoolCountry
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const subscriptionMutation = useMutation({
    mutationFn: async (data: NewsletterData) => {
      await apiRequest('POST', '/api/mailchimp/subscribe', data);
    },
    onSuccess: () => {
      setIsSubscribed(true);
      setEmail("");
      setFirstName("");
      setLastName("");
      toast({
        title: "🎉 Welcome to our community!",
        description: "You've successfully subscribed to the Plastic Clever Schools newsletter.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to subscribe to newsletter. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    subscriptionMutation.mutate({
      email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      schoolName: schoolName || undefined,
      schoolCountry: schoolCountry || undefined,
      tags: ['newsletter_signup', 'website_subscriber'],
    });
  };

  if (isSubscribed) {
    return (
      <Card className={`${className} border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 text-green-700 dark:text-green-300">
            <CheckCircle className="h-6 w-6" />
            <div>
              <h3 className="font-semibold">You're all set!</h3>
              <p className="text-sm">Thank you for joining our community. Check your email for updates!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <div className={`flex gap-2 ${className}`}>
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
          data-testid="input-newsletter-email"
        />
        <Button 
          onClick={handleSubmit}
          disabled={subscriptionMutation.isPending}
          data-testid="button-newsletter-subscribe"
        >
          {subscriptionMutation.isPending ? "..." : "Subscribe"}
        </Button>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className={`bg-gradient-to-r from-coral to-yellow text-navy p-6 rounded-xl shadow-lg border border-coral/20 ${className}`}>
        <div className="max-w-md mx-auto text-center">
          <Mail className="h-10 w-10 mx-auto mb-3 text-navy/80" />
          <h3 className="text-xl font-bold mb-2 text-navy">Stay Connected</h3>
          <p className="text-navy/80 mb-4 text-sm">
            Get the latest updates on plastic pollution solutions and educational resources.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-white/90 border-navy/20 text-navy placeholder:text-navy/60"
                data-testid="input-newsletter-firstname"
              />
              <Input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-white/90 border-navy/20 text-navy placeholder:text-navy/60"
                data-testid="input-newsletter-lastname"
              />
            </div>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/90 border-navy/20 text-navy placeholder:text-navy/60"
              required
              data-testid="input-newsletter-email"
            />
            <Button 
              type="submit"
              disabled={subscriptionMutation.isPending}
              className="w-full bg-navy text-white hover:bg-navy/90 font-semibold"
              data-testid="button-newsletter-subscribe"
            >
              {subscriptionMutation.isPending ? "Subscribing..." : "Subscribe to Newsletter"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <Card className={className}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-2">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-xl">Join Our Newsletter</CardTitle>
        <CardDescription>
          Stay updated with the latest resources, success stories, and tips for tackling plastic pollution in schools.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              data-testid="input-newsletter-firstname"
            />
            <Input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              data-testid="input-newsletter-lastname"
            />
          </div>
          <Input
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="input-newsletter-email"
          />
          <Button 
            type="submit"
            disabled={subscriptionMutation.isPending}
            className="w-full"
            data-testid="button-newsletter-subscribe"
          >
            {subscriptionMutation.isPending ? (
              <>
                <AlertCircle className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Subscribe to Newsletter
              </>
            )}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-3 text-center">
          By subscribing, you agree to receive updates about Plastic Clever Schools. 
          You can unsubscribe at any time.
        </p>
      </CardContent>
    </Card>
  );
}